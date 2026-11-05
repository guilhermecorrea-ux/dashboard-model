// Bling (API v3): pedidos de todos os canais, produtos com custo, estoque por depósito e contas.
// Token OAuth renovado a cada execução (o refresh token novo fica salvo no banco).
// ⚠️ Campos marcados com VALIDAR precisam ser conferidos com a conta real na instalação.
import { exigir } from "../lib/env";
import { gravarCredencial, lerCredencial } from "../lib/db";
import { anonimo, buscar, diasEntre, esperar, json, num } from "../lib/util";

const API = "https://api.bling.com.br/Api/v3";
let acesso: string | null = null;
let ultimo = 0;

/** Bling limita a 3 requisições por segundo. */
async function chamar<T>(caminho: string): Promise<T> {
  const espera = 350 - (Date.now() - ultimo);
  if (espera > 0) await esperar(espera);
  ultimo = Date.now();
  const r = await buscar(`${API}${caminho}`, { headers: { Authorization: `Bearer ${await token()}`, Accept: "application/json" } });
  return json<T>(r, `Bling ${caminho.split("?")[0]}`);
}

export async function trocarCodigo(codigo: string, redirect: string) {
  return pedirToken(new URLSearchParams({ grant_type: "authorization_code", code: codigo, redirect_uri: redirect }));
}

async function pedirToken(corpo: URLSearchParams) {
  const basic = Buffer.from(`${exigir("BLING_CLIENT_ID")}:${exigir("BLING_CLIENT_SECRET")}`).toString("base64");
  const r = await buscar(`${API}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: corpo,
  });
  const t = await json<{ access_token: string; refresh_token: string; expires_in: number }>(r, "Bling token");
  await gravarCredencial("bling", { refresh_token: t.refresh_token, renovado_em: new Date().toISOString() });
  acesso = t.access_token;
  return t;
}

async function token(): Promise<string> {
  if (acesso) return acesso;
  const c = await lerCredencial<{ refresh_token: string }>("bling");
  if (!c?.refresh_token) throw new Error("Bling sem autorização. Rode: npm run autorizar -- bling");
  await pedirToken(new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.refresh_token }));
  return acesso!;
}

async function todasPaginas<T>(caminho: string): Promise<T[]> {
  const out: T[] = [];
  for (let pagina = 1; ; pagina++) {
    const sep = caminho.includes("?") ? "&" : "?";
    const { data } = await chamar<{ data: T[] }>(`${caminho}${sep}pagina=${pagina}&limite=100`);
    out.push(...data);
    if (data.length < 100) return out;
  }
}

export interface PedidoBling {
  id: number;
  data: string;
  totalProdutos?: number;
  total?: number;
  loja?: { id: number } | null;
  contato?: { id: number; nome?: string; tipoPessoa?: string } | null;
  situacao?: { id: number; valor?: number } | null;
  desconto?: { valor?: number } | null;
  itens?: { codigo?: string; quantidade: number; valor: number }[];
  transporte?: { frete?: number; etiqueta?: { uf?: string } | null } | null;
  vendedor?: { id: number } | null;
  parcelas?: { dataVencimento: string }[];
  notaFiscal?: { id: number } | null;
}

/** Converte um pedido do Bling para o formato padrão. Função pura (testada). */
export function mapearPedido(p: PedidoBling, sal: string, vendedores: Record<number, string> = {}) {
  const itens = (p.itens ?? []).map((i) => ({ sku: i.codigo || "sem-sku", qtd: num(i.quantidade), preco_unit: num(i.valor) }));
  const bruto = itens.reduce((s, i) => s + i.qtd * i.preco_unit, 0) || num(p.totalProdutos);
  const pj = p.contato?.tipoPessoa === "J";
  const venc = p.parcelas?.[0]?.dataVencimento;
  const cancelado = p.situacao?.valor === 2; // VALIDAR: situação "Cancelado" no Bling
  return {
    id: `bling:${p.id}`,
    fonte: "bling",
    loja_id: String(p.loja?.id ?? 0),
    data: p.data.slice(0, 10),
    uf: p.transporte?.etiqueta?.uf?.toUpperCase() ?? null,
    cliente_id: anonimo(p.contato?.id, sal),
    cliente_nome: pj ? p.contato?.nome ?? null : null, // só razão social de empresas
    valor_bruto: Math.round(bruto * 100) / 100,
    desconto: num(p.desconto?.valor),
    frete: num(p.transporte?.frete),
    reembolso: cancelado ? Math.round((bruto - num(p.desconto?.valor)) * 100) / 100 : 0,
    vendedor: p.vendedor?.id ? vendedores[p.vendedor.id] ?? `Vendedor ${p.vendedor.id}` : null,
    prazo_recebimento_dias: venc ? Math.max(0, Math.round(diasEntre(p.data.slice(0, 10), venc))) : null,
    status: cancelado ? "cancelado" : "ok",
    itens,
  };
}

export async function buscarPedidos(desde: string, ate: string) {
  const sal = exigir("CLIENTE_SALT");
  const lista = await todasPaginas<{ id: number }>(`/pedidos/vendas?dataInicial=${desde}&dataFinal=${ate}`);
  const vendedores: Record<number, string> = {};
  try {
    for (const v of await todasPaginas<{ id: number; contato?: { nome?: string } }>("/vendedores")) vendedores[v.id] = v.contato?.nome ?? `Vendedor ${v.id}`;
  } catch { /* conta sem vendedores cadastrados */ }
  const out = [];
  for (const { id } of lista) {
    const { data } = await chamar<{ data: PedidoBling }>(`/pedidos/vendas/${id}`);
    out.push(mapearPedido(data, sal, vendedores));
  }
  return out;
}

/** Lojas/canais que aparecem nos pedidos, com o nome quando a API informar. */
export async function buscarLojas(ids: string[]) {
  const nomes: Record<string, string> = {};
  try {
    // VALIDAR: endpoint de canais de venda da conta
    for (const c of await todasPaginas<{ id: number; descricao?: string; nome?: string }>("/canais-venda")) nomes[String(c.id)] = c.descricao ?? c.nome ?? "";
  } catch { /* sem permissão ou endpoint diferente: usa o id */ }
  return ids.map((id) => ({ id, nome: nomes[id] || (id === "0" ? "Bling (sem loja)" : `Loja Bling ${id}`) }));
}

export async function buscarProdutos() {
  const lista = await todasPaginas<{ id: number; codigo?: string; nome: string; preco?: number; precoCusto?: number }>("/produtos?criterio=2");
  return lista.map((p) => ({
    sku: p.codigo || `bling-${p.id}`,
    nome: p.nome,
    preco: num(p.preco),
    custo: num(p.precoCusto), // VALIDAR: em algumas contas o custo vem em fornecedor.precoCusto
    _id: p.id,
  }));
}

export async function buscarEstoque(produtos: { sku: string; _id: number }[]) {
  const depositos: Record<number, string> = {};
  for (const d of await todasPaginas<{ id: number; descricao: string }>("/depositos")) depositos[d.id] = d.descricao;
  const out: { sku: string; deposito: string; quantidade: number }[] = [];
  for (let i = 0; i < produtos.length; i += 50) {
    const lote = produtos.slice(i, i + 50);
    const qs = lote.map((p) => `idsProdutos[]=${p._id}`).join("&");
    const { data } = await chamar<{ data: { produto: { id: number }; depositos?: { id: number; saldoFisico: number }[] }[] }>(`/estoques/saldos?${qs}`);
    for (const s of data) {
      const sku = lote.find((p) => p._id === s.produto.id)?.sku;
      if (!sku) continue;
      for (const d of s.depositos ?? []) out.push({ sku, deposito: depositos[d.id] ?? `Depósito ${d.id}`, quantidade: num(d.saldoFisico) });
    }
  }
  return out;
}

export async function buscarContas(desde: string, ate: string, fixas: string[]) {
  const cats: Record<number, string> = {};
  try {
    for (const c of await todasPaginas<{ id: number; descricao: string }>("/categorias/receitas-despesas")) cats[c.id] = c.descricao;
  } catch { /* sem categorias */ }
  const out = [];
  for (const [tipo, rota] of [["pagar", "/contas/pagar"], ["receber", "/contas/receber"]] as const) {
    const lista = await todasPaginas<{ id: number; vencimento: string; valor: number; situacao: number; categoria?: { id: number }; contato?: { nome?: string }; dataPagamento?: string; historico?: string }>(
      `${rota}?dataVencimentoInicial=${desde}&dataVencimentoFinal=${ate}`,
    );
    for (const c of lista) {
      const categoria = (c.categoria?.id && cats[c.categoria.id]) || "Sem categoria";
      const pago = c.situacao === 2 || c.situacao === 3; // VALIDAR: 1 aberto, 2 pago/recebido, 3 parcial
      out.push({
        id: `bling:${tipo}:${c.id}`, tipo, categoria,
        // A receber: sem nome do contato (pode ser pessoa física). A pagar: fornecedor.
        descricao: tipo === "receber" ? c.historico ?? null : c.historico ?? c.contato?.nome ?? null,
        valor: num(c.valor), vencimento: c.vencimento, pago_em: pago ? c.dataPagamento ?? c.vencimento : null,
        fixa: fixas.includes(categoria),
      });
    }
  }
  return out;
}
