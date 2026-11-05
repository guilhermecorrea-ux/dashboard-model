// Dados reais: lê as tabelas do Supabase da empresa com o login do usuário.
// As permissões (quem vê o quê) são aplicadas pelo próprio banco (Row Level Security).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataProvider, Dataset, Fonte, LojaCanal, Meta, Pedido, SyncStatus, TrafegoDiario } from "./types";
import { addDays, toISO } from "../lib/dates";

let cliente: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!cliente) {
    const url = import.meta.env.VITE_SUPABASE_URL, chave = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !chave) throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja app/.env.exemplo).");
    cliente = createClient(url, chave, { auth: { persistSession: true, detectSessionInUrl: true } });
  }
  return cliente;
}

/** Lê uma tabela inteira em páginas de 1.000 linhas. */
async function tudo<T>(tabela: string, colunas = "*", filtro?: (q: any) => any): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    let q = supabase().from(tabela).select(colunas).range(de, de + 999);
    if (filtro) q = filtro(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabela}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

const n = (v: unknown) => Number(v ?? 0);
const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export const supabaseProvider: DataProvider = {
  async load(): Promise<Dataset> {
    const hoje = hojeBR();
    const inicio = addDays(hoje, -400);
    const [config, lojas, produtos, pedidosRaw, itens, estoque, midia, trafego, financeiro, metas, logs] = await Promise.all([
      tudo<{ chave: string; valor: unknown }>("config"),
      tudo<{ id: string; nome: string; classe: LojaCanal["classe"]; espelha_site: boolean }>("lojas_canais"),
      tudo<{ sku: string; nome: string; custo: number; preco: number; categoria: string | null }>("produtos"),
      tudo<Record<string, any>>("pedidos", "*", (q) => q.gte("data", inicio)), // eslint-disable-line @typescript-eslint/no-explicit-any
      tudo<{ pedido_id: string; sku: string; qtd: number; preco_unit: number }>("itens_pedido", "pedido_id,sku,qtd,preco_unit"),
      tudo<{ sku: string; deposito: string; quantidade: number; ultima_venda: string | null }>("estoque"),
      tudo<Record<string, any>>("midia_diaria", "*", (q) => q.gte("data", inicio)), // eslint-disable-line @typescript-eslint/no-explicit-any
      tudo<TrafegoDiario>("trafego_diario", "*", (q) => q.gte("data", inicio)),
      tudo<Record<string, any>>("financeiro").catch(() => []), // sem permissão: vazio // eslint-disable-line @typescript-eslint/no-explicit-any
      tudo<Meta>("metas"),
      tudo<{ fonte: string; fim: string; ok: boolean; dados_ate: string | null }>("sync_log", "fonte,fim,ok,dados_ate", (q) => q.order("fim", { ascending: false }).limit(200)),
    ]);
    const cfg = Object.fromEntries(config.map((c) => [c.chave, c.valor]));
    const itensPor = new Map<string, Pedido["itens"]>();
    for (const i of itens) {
      const l = itensPor.get(i.pedido_id) ?? [];
      l.push({ sku: i.sku, qtd: n(i.qtd), precoUnit: n(i.preco_unit) });
      itensPor.set(i.pedido_id, l);
    }
    const ordenados = [...pedidosRaw].sort((a, b) => String(a.data).localeCompare(String(b.data)));
    const visto = new Set<string>();
    const ultimaVenda: Record<string, string> = {};
    const pedidos: Pedido[] = ordenados.map((p) => {
      const novo = !!p.cliente_id && !visto.has(p.cliente_id);
      if (p.cliente_id) visto.add(p.cliente_id);
      const its = itensPor.get(p.id) ?? [];
      for (const it of its) if (!ultimaVenda[it.sku] || p.data > ultimaVenda[it.sku]) ultimaVenda[it.sku] = p.data;
      return {
        id: p.id, fonte: p.fonte, lojaId: p.loja_id, data: p.data, uf: p.uf ?? "", clienteId: p.cliente_id ?? p.id,
        clienteNovo: p.fonte === "shopify" ? novo : true, valorBruto: n(p.valor_bruto), desconto: n(p.desconto), frete: n(p.frete),
        reembolso: n(p.reembolso), cupom: p.cupom ?? undefined, origem: p.origem ?? undefined, itens: its,
        diasPreparacao: p.dias_preparacao === null ? undefined : n(p.dias_preparacao), vendedor: p.vendedor ?? undefined,
        clienteNome: p.cliente_nome ?? undefined, prazoRecebimentoDias: p.prazo_recebimento_dias ?? undefined,
      };
    });
    const fontes: Fonte[] = ["shopify", "bling", "meta", "google_ads", "ga4"];
    const sync: SyncStatus[] = fontes.flatMap((f) => {
      const l = logs.find((x) => x.fonte === f);
      return l ? [{ fonte: f, ultimaExecucao: toISO(new Date(l.fim)) + "T" + new Date(l.fim).toTimeString().slice(0, 5), ok: l.ok, dadosAte: l.dados_ate ?? hoje }] : [];
    });
    return {
      empresa: (cfg.empresa as string) ?? "Empresa",
      hoje,
      inicioHistorico: (cfg.inicio_historico as string) ?? pedidos[0]?.data ?? addDays(hoje, -365),
      lojas: lojas.map((l) => ({ id: l.id, nome: l.nome, classe: l.classe, espelhaSite: l.espelha_site })),
      produtos: produtos.map((p) => ({ sku: p.sku, nome: p.nome, custo: n(p.custo), preco: n(p.preco), categoria: p.categoria ?? "" })),
      pedidos,
      estoque: estoque.map((e) => ({ sku: e.sku, deposito: e.deposito, quantidade: n(e.quantidade), ultimaVenda: e.ultima_venda ?? ultimaVenda[e.sku] ?? addDays(hoje, -365) })),
      midia: midia.map((m) => ({ data: m.data, plataforma: m.plataforma, campanha: m.campanha, investimento: n(m.investimento), receitaAtribuida: n(m.receita_atribuida), conversoes: n(m.conversoes) })),
      trafego: trafego.map((t) => ({ ...t, sessoes: n(t.sessoes), carrinho: n(t.carrinho), checkout: n(t.checkout), compras: n(t.compras) })),
      financeiro: financeiro.map((f) => ({ id: f.id, tipo: f.tipo, categoria: f.categoria, descricao: f.descricao ?? "", valor: n(f.valor), vencimento: f.vencimento, pagoEm: f.pago_em ?? undefined, fixa: !!f.fixa })),
      metas: metas.map((m) => ({ ano: m.ano, mes: m.mes, area: m.area, valor: n(m.valor) })),
      sync,
      aliquotaImpostos: Number(cfg.aliquota_impostos ?? 0.09),
      saldoInicialCaixa: Number(cfg.saldo_inicial_caixa ?? 0),
    };
  },
  async saveMetas(metas: Meta[]) {
    const { error } = await supabase().from("metas").upsert(metas.map((m) => ({ ...m, atualizado_em: new Date().toISOString() })));
    if (error) throw new Error(`Não foi possível salvar as metas: ${error.message}`);
  },
  async saveLojas(lojas: LojaCanal[]) {
    for (const l of lojas) {
      const { error } = await supabase().from("lojas_canais").update({ classe: l.classe, espelha_site: !!l.espelhaSite, atualizado_em: new Date().toISOString() }).eq("id", l.id);
      if (error) throw new Error(`Não foi possível salvar a loja ${l.nome}: ${error.message}`);
    }
  },
};

/** Login sem senha: envia o link mágico por e-mail. */
export async function enviarLink(email: string) {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname, shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function sessaoAtual(): Promise<{ email: string; perfil: string } | null> {
  const { data } = await supabase().auth.getSession();
  const email = data.session?.user.email;
  if (!email) return null;
  const { data: p } = await supabase().from("usuarios_perfis").select("perfil").eq("email", email.toLowerCase()).maybeSingle();
  return p ? { email, perfil: p.perfil } : null;
}

export const sair = () => supabase().auth.signOut();
