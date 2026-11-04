// Camada de KPIs. Cada fórmula segue docs/KPIS.md e existe uma vez só.
// Na produção estas contas viram views SQL no Supabase; a assinatura continua a mesma.

import { addDays, daysInMonth, diffDays, fromISO, monthKey } from "../lib/dates";
import type { Area, ClasseLoja, Dataset, LancamentoFinanceiro, Pedido } from "../data/types";
import { dentro, type Intervalo } from "./periodo";

export type Recorte = "tudo" | "site" | "marketplace" | "b2b";

export const NOME_CANAL: Record<string, string> = {
  shopify: "Site",
  "bl-ml": "Mercado Livre",
  "bl-shopee": "Shopee",
  "bl-amazon": "Amazon",
  "bl-atacado": "B2B",
  "bl-magalu": "Magalu",
};

/** Contexto pré-processado uma vez por carga de dados. */
export interface Ctx {
  ds: Dataset;
  classe: (p: Pedido) => ClasseLoja | null;
  custo: Record<string, number>;
  nomeProduto: Record<string, string>;
  primeiraCompra: Record<string, string>;
  comprasCliente: Record<string, string[]>;
}

export function criarCtx(ds: Dataset): Ctx {
  const lojas = Object.fromEntries(ds.lojas.map((l) => [l.id, l]));
  const classe = (p: Pedido): ClasseLoja | null => {
    if (p.fonte === "shopify") return "site";
    const l = lojas[p.lojaId];
    if (!l) return "nao_classificada";
    if (l.espelhaSite) return null; // o site vem da Shopify: excluir para não contar duas vezes
    return l.classe;
  };
  const primeiraCompra: Record<string, string> = {};
  const comprasCliente: Record<string, string[]> = {};
  for (const p of ds.pedidos) {
    if (p.fonte !== "shopify" && p.lojaId !== "bl-atacado") continue;
    (comprasCliente[p.clienteId] ??= []).push(p.data);
    if (!primeiraCompra[p.clienteId] || p.data < primeiraCompra[p.clienteId]) primeiraCompra[p.clienteId] = p.data;
  }
  return {
    ds,
    classe,
    custo: Object.fromEntries(ds.produtos.map((p) => [p.sku, p.custo])),
    nomeProduto: Object.fromEntries(ds.produtos.map((p) => [p.sku, p.nome])),
    primeiraCompra,
    comprasCliente,
  };
}

export const receitaPedido = (p: Pedido) => p.valorBruto - p.desconto - p.reembolso;
const areaDe = (c: ClasseLoja | null): Area | null => (c === "b2b" ? "B2B" : c === "site" || c === "marketplace" ? "DTC" : null);

export function pedidos(ctx: Ctx, i: Intervalo, recorte: Recorte = "tudo"): Pedido[] {
  return ctx.ds.pedidos.filter((p) => {
    if (!dentro(p.data, i)) return false;
    const c = ctx.classe(p);
    if (c === null || c === "nao_classificada") return false;
    if (recorte === "tudo") return true;
    return c === recorte;
  });
}

export const pedidosNaoClassificados = (ctx: Ctx, i: Intervalo) =>
  ctx.ds.pedidos.filter((p) => dentro(p.data, i) && ctx.classe(p) === "nao_classificada");

export const soma = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);
const cmvPedido = (ctx: Ctx, p: Pedido) => soma(p.itens, (it) => it.qtd * (ctx.custo[it.sku] ?? 0));

/** Variação relativa; null quando não há base de comparação. */
export const variacao = (atual: number, anterior: number | null | undefined) =>
  anterior === null || anterior === undefined || anterior === 0 ? null : (atual - anterior) / Math.abs(anterior);

// ---------------------------------------------------------------- Planejado × realizado

export function planejado(ctx: Ctx, i: Intervalo, area?: Area): number {
  let total = 0;
  for (let d = i.inicio; d <= i.fim; d = addDays(d, 1)) {
    const dt = fromISO(d);
    const y = dt.getFullYear(), m = dt.getMonth() + 1;
    const metas = ctx.ds.metas.filter((x) => x.ano === y && x.mes === m && (!area || x.area === area));
    total += soma(metas, (x) => x.valor) / daysInMonth(y, m);
  }
  return total;
}

/** Projeção de fechamento do mês no ritmo atual (hoje conta como meio dia, pois os dados vão até o meio-dia). */
export function projecaoMes(realizadoMes: number, hoje: string): number {
  const dt = fromISO(hoje);
  const decorridos = dt.getDate() - 0.5;
  return (realizadoMes / decorridos) * daysInMonth(dt.getFullYear(), dt.getMonth() + 1);
}

export function receitaArea(ctx: Ctx, i: Intervalo, area?: Area) {
  return soma(pedidos(ctx, i).filter((p) => !area || areaDe(ctx.classe(p)) === area), receitaPedido);
}

// ---------------------------------------------------------------- Resultado (margens)

export interface Resultado {
  receitaBruta: number;
  descontos: number;
  devolucoes: number;
  impostos: number;
  receitaLiquida: number;
  cmv: number;
  lucroBruto: number;
  margemBruta: number;
  frete: number;
  midia: number;
  margemContribuicao: number;
  mcPct: number;
  despesasFixas: Record<string, number>;
  totalFixas: number;
  ebitda: number;
  ebitdaPct: number;
  pedidos: number;
}

/** Despesas do mês rateadas pelos dias do período (evita que um período curto pegue ou perca uma conta inteira). */
function rateado(ctx: Ctx, i: Intervalo, f: (l: LancamentoFinanceiro) => boolean) {
  const porCategoria: Record<string, number> = {};
  const lancs = ctx.ds.financeiro.filter((l) => l.tipo === "pagar" && f(l));
  for (let d = i.inicio; d <= i.fim; d = addDays(d, 1)) {
    const mk = monthKey(d);
    const [y, m] = mk.split("-").map(Number);
    for (const l of lancs) {
      if (monthKey(l.vencimento) !== mk) continue;
      porCategoria[l.categoria] = (porCategoria[l.categoria] ?? 0) + l.valor / daysInMonth(y, m);
    }
  }
  return { porCategoria, total: soma(Object.values(porCategoria), (x) => x) };
}

export function midiaTotal(ctx: Ctx, i: Intervalo) {
  return soma(ctx.ds.midia.filter((m) => dentro(m.data, i)), (m) => m.investimento);
}

export function resultado(ctx: Ctx, i: Intervalo, recorte: Recorte = "tudo"): Resultado {
  const ps = pedidos(ctx, i, recorte);
  const receitaBruta = soma(ps, (p) => p.valorBruto);
  const descontos = soma(ps, (p) => p.desconto);
  const devolucoes = soma(ps, (p) => p.reembolso);
  const vendaLiquida = receitaBruta - descontos - devolucoes;
  const impostos = vendaLiquida * ctx.ds.aliquotaImpostos;
  const receitaLiquida = vendaLiquida - impostos;
  const cmv = soma(ps, (p) => (p.reembolso > 0 ? 0 : cmvPedido(ctx, p)));
  const lucroBruto = receitaLiquida - cmv;
  // Frete: custo pago às transportadoras no período, rateado pela participação do recorte na receita.
  const recTotal = recorte === "tudo" ? vendaLiquida : receitaArea(ctx, i);
  const share = recTotal ? vendaLiquida / recTotal : 0;
  const frete = rateado(ctx, i, (l) => l.categoria === "Frete e logística").total * (recorte === "tudo" ? 1 : share);
  const midia = recorte === "b2b" ? 0 : midiaTotal(ctx, i);
  const margemContribuicao = lucroBruto - frete - midia;
  const despesasFixas = rateado(ctx, i, (l) => l.fixa).porCategoria;
  const totalFixas = soma(Object.values(despesasFixas), (x) => x);
  const ebitda = margemContribuicao - totalFixas;
  return {
    receitaBruta, descontos, devolucoes, impostos, receitaLiquida, cmv, lucroBruto,
    margemBruta: vendaLiquida ? lucroBruto / vendaLiquida : 0,
    frete, midia, margemContribuicao, mcPct: vendaLiquida ? margemContribuicao / vendaLiquida : 0,
    despesasFixas, totalFixas, ebitda, ebitdaPct: vendaLiquida ? ebitda / vendaLiquida : 0, pedidos: ps.length,
  };
}

// ---------------------------------------------------------------- Séries e quebras

export interface PontoMensal { mes: string; realizado: number; planejado: number; projecao?: number }

export function serieMensal(ctx: Ctx, area?: Area): PontoMensal[] {
  const { hoje, inicioHistorico } = ctx.ds;
  const out: PontoMensal[] = [];
  const atual = monthKey(hoje);
  for (let k = monthKey(addDays(inicioHistorico, 31)); k <= atual; ) {
    const [y, m] = k.split("-").map(Number);
    const i = { inicio: `${k}-01`, fim: k === atual ? hoje : `${k}-${String(daysInMonth(y, m)).padStart(2, "0")}` };
    const realizado = receitaArea(ctx, i, area);
    const full = { inicio: `${k}-01`, fim: `${k}-${String(daysInMonth(y, m)).padStart(2, "0")}` };
    out.push({ mes: k, realizado, planejado: planejado(ctx, full, area), projecao: k === atual ? projecaoMes(realizado, hoje) : undefined });
    const nx = new Date(y, m, 1);
    k = `${nx.getFullYear()}-${String(nx.getMonth() + 1).padStart(2, "0")}`;
  }
  return out;
}

export function porCanal(ctx: Ctx, i: Intervalo, recorte: Recorte = "tudo") {
  const acc: Record<string, number> = {};
  for (const p of pedidos(ctx, i, recorte)) acc[p.lojaId] = (acc[p.lojaId] ?? 0) + receitaPedido(p);
  return Object.entries(acc)
    .map(([id, valor]) => ({ id, nome: NOME_CANAL[id] ?? id, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function porUF(ctx: Ctx, i: Intervalo, recorte: Recorte = "tudo") {
  const acc: Record<string, { receita: number; pedidos: number }> = {};
  for (const p of pedidos(ctx, i, recorte)) {
    const a = (acc[p.uf] ??= { receita: 0, pedidos: 0 });
    a.receita += receitaPedido(p);
    a.pedidos += 1;
  }
  return acc;
}

export function porProduto(ctx: Ctx, i: Intervalo, recorte: Recorte = "tudo") {
  const acc: Record<string, { receita: number; unidades: number; cmv: number }> = {};
  for (const p of pedidos(ctx, i, recorte)) {
    const fator = p.valorBruto ? receitaPedido(p) / p.valorBruto : 0;
    for (const it of p.itens) {
      const a = (acc[it.sku] ??= { receita: 0, unidades: 0, cmv: 0 });
      a.receita += it.qtd * it.precoUnit * fator;
      a.unidades += it.qtd;
      a.cmv += p.reembolso > 0 ? 0 : it.qtd * (ctx.custo[it.sku] ?? 0);
    }
  }
  return Object.entries(acc)
    .map(([sku, v]) => ({ sku, nome: ctx.nomeProduto[sku] ?? sku, ...v, margem: v.receita ? (v.receita * (1 - ctx.ds.aliquotaImpostos) - v.cmv) / v.receita : 0 }))
    .sort((a, b) => b.receita - a.receita);
}

// ---------------------------------------------------------------- DTC

export function dtc(ctx: Ctx, i: Intervalo) {
  const site = pedidos(ctx, i, "site");
  const mkt = pedidos(ctx, i, "marketplace");
  const todos = [...site, ...mkt];
  const receita = soma(todos, receitaPedido);
  const receitaSite = soma(site, receitaPedido);
  const gasto = midiaTotal(ctx, i);
  const novos = site.filter((p) => ctx.primeiraCompra[p.clienteId] === p.data && p.clienteNovo);
  const clientesNovos = new Set(novos.map((p) => p.clienteId)).size;
  const recorrentes = site.filter((p) => !p.clienteNovo);
  const comCupom = site.filter((p) => p.cupom);
  return {
    receita,
    receitaSite,
    pedidos: todos.length,
    pedidosSite: site.length,
    ticket: todos.length ? receita / todos.length : 0,
    gasto,
    roas: gasto ? receitaSite / gasto : null,
    cac: clientesNovos ? gasto / clientesNovos : null,
    clientesNovos,
    receitaNovos: soma(novos, receitaPedido),
    receitaRecorrentes: soma(recorrentes, receitaPedido),
    pctMidia: receitaSite ? gasto / receita : 0,
    descontoMedio: soma(site, (p) => p.valorBruto) ? soma(site, (p) => p.desconto) / soma(site, (p) => p.valorBruto) : 0,
    usoCupom: site.length ? comCupom.length / site.length : 0,
  };
}

/** % de clientes do site que compram de novo em até 90 dias após a primeira compra (coorte de 90 a 180 dias atrás). */
export function taxaRecorrencia(ctx: Ctx, fim: string): number | null {
  const iniCoorte = addDays(fim, -180), fimCoorte = addDays(fim, -90);
  if (iniCoorte < ctx.ds.inicioHistorico) return null;
  let base = 0, voltaram = 0;
  for (const [cid, primeira] of Object.entries(ctx.primeiraCompra)) {
    if (cid.startsWith("b2b") || primeira < iniCoorte || primeira > fimCoorte) continue;
    base++;
    const limite = addDays(primeira, 90);
    if (ctx.comprasCliente[cid].some((d) => d > primeira && d <= limite)) voltaram++;
  }
  return base ? voltaram / base : null;
}

export function cupons(ctx: Ctx, i: Intervalo) {
  const acc: Record<string, { pedidos: number; desconto: number; receita: number }> = {};
  for (const p of pedidos(ctx, i, "site")) {
    if (!p.cupom) continue;
    const a = (acc[p.cupom] ??= { pedidos: 0, desconto: 0, receita: 0 });
    a.pedidos++; a.desconto += p.desconto; a.receita += receitaPedido(p);
  }
  return Object.entries(acc).map(([cupom, v]) => ({ cupom, ...v })).sort((a, b) => b.pedidos - a.pedidos);
}

export function campanhas(ctx: Ctx, i: Intervalo) {
  const acc: Record<string, { plataforma: string; investimento: number; receita: number; conversoes: number }> = {};
  for (const m of ctx.ds.midia) {
    if (!dentro(m.data, i)) continue;
    const a = (acc[m.campanha] ??= { plataforma: m.plataforma, investimento: 0, receita: 0, conversoes: 0 });
    a.investimento += m.investimento; a.receita += m.receitaAtribuida; a.conversoes += m.conversoes;
  }
  return Object.entries(acc).map(([campanha, v]) => ({ campanha, ...v, roas: v.investimento ? v.receita / v.investimento : 0 }))
    .sort((a, b) => b.investimento - a.investimento);
}

export function trafego(ctx: Ctx, i: Intervalo) {
  const ts = ctx.ds.trafego.filter((t) => dentro(t.data, i));
  const origem: Record<string, number> = {};
  const disp: Record<string, { sessoes: number; compras: number }> = {};
  for (const t of ts) {
    origem[t.origem] = (origem[t.origem] ?? 0) + t.sessoes;
    const d = (disp[t.dispositivo] ??= { sessoes: 0, compras: 0 });
    d.sessoes += t.sessoes; d.compras += t.compras;
  }
  const sessoes = soma(ts, (t) => t.sessoes);
  const pedidosSite = pedidos(ctx, { inicio: i.inicio, fim: i.fim < ctx.ds.hoje ? i.fim : addDays(ctx.ds.hoje, -1) }, "site").length;
  return {
    sessoes,
    funil: [
      { etapa: "Sessões", valor: sessoes },
      { etapa: "Carrinho", valor: soma(ts, (t) => t.carrinho) },
      { etapa: "Checkout", valor: soma(ts, (t) => t.checkout) },
      { etapa: "Compra", valor: soma(ts, (t) => t.compras) },
    ],
    conversao: sessoes ? pedidosSite / sessoes : 0,
    origem: Object.entries(origem).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    dispositivo: Object.entries(disp).map(([nome, v]) => ({ nome, ...v, conversao: v.sessoes ? v.compras / v.sessoes : 0 })),
  };
}

// ---------------------------------------------------------------- B2B

export function b2b(ctx: Ctx, i: Intervalo) {
  const ps = pedidos(ctx, i, "b2b");
  const receita = soma(ps, receitaPedido);
  const todos = ctx.ds.pedidos.filter((p) => p.lojaId === "bl-atacado");
  const ultima: Record<string, string> = {};
  const nome: Record<string, string> = {};
  const datas: Record<string, string[]> = {};
  for (const p of todos) {
    if (p.data > i.fim) continue;
    nome[p.clienteId] = p.clienteNome ?? p.clienteId;
    if (!ultima[p.clienteId] || p.data > ultima[p.clienteId]) ultima[p.clienteId] = p.data;
    (datas[p.clienteId] ??= []).push(p.data);
  }
  const limiteAtivo = addDays(i.fim, -90);
  const ativos = Object.keys(ultima).filter((c) => ultima[c] > limiteAtivo);
  const novos = Object.keys(ultima).filter((c) => dentro(ctx.primeiraCompra[c], i));
  const perdidos = Object.keys(ultima).filter((c) => ultima[c] <= limiteAtivo && ultima[c] > addDays(i.fim, -180));
  const porCliente: Record<string, number> = {};
  for (const p of ps) porCliente[p.clienteId] = (porCliente[p.clienteId] ?? 0) + receitaPedido(p);
  const ranking = Object.entries(porCliente).map(([id, v]) => ({ id, nome: nome[id], valor: v })).sort((a, b) => b.valor - a.valor);
  const top = (n: number) => (receita ? soma(ranking.slice(0, n), (x) => x.valor) / receita : 0);
  const intervaloMedio: Record<string, number> = {};
  for (const [c, ds] of Object.entries(datas)) {
    const s = [...ds].sort();
    if (s.length > 1) intervaloMedio[c] = diffDays(s[0], s[s.length - 1]) / (s.length - 1);
  }
  const freqMedia = Object.values(intervaloMedio).length ? soma(Object.values(intervaloMedio), (x) => x) / Object.values(intervaloMedio).length : null;
  const emRisco = ativos
    .map((c) => ({ id: c, nome: nome[c], dias: diffDays(ultima[c], i.fim), habitual: intervaloMedio[c] ?? 30 }))
    .filter((x) => x.dias > x.habitual * 1.5)
    .sort((a, b) => b.dias / b.habitual - a.dias / a.habitual);
  const vend: Record<string, number> = {};
  for (const p of ps) vend[p.vendedor ?? "Sem vendedor"] = (vend[p.vendedor ?? "Sem vendedor"] ?? 0) + receitaPedido(p);
  const res = resultado(ctx, i, "b2b");
  const receber = ctx.ds.financeiro.filter((l) => l.tipo === "receber" && l.categoria === "Vendas B2B" && !l.pagoEm && l.vencimento <= ctx.ds.hoje);
  const aberto = ctx.ds.financeiro.filter((l) => l.tipo === "receber" && l.categoria === "Vendas B2B" && !l.pagoEm);
  return {
    receita,
    pedidos: ps.length,
    ticket: ps.length ? receita / ps.length : 0,
    ativos: ativos.length,
    novos: novos.length,
    perdidos: perdidos.length,
    top5: top(5),
    top10: top(10),
    ranking,
    freqMedia,
    emRisco,
    vendedores: Object.entries(vend).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    margem: res.margemBruta,
    prazoMedio: receita ? soma(ps, (p) => (p.prazoRecebimentoDias ?? 0) * receitaPedido(p)) / receita : 0,
    inadimplencia: soma(aberto, (l) => l.valor) ? soma(receber, (l) => l.valor) / soma(aberto, (l) => l.valor) : 0,
    vencido: soma(receber, (l) => l.valor),
  };
}

// ---------------------------------------------------------------- Supply Chain

export const PRAZO_REPOSICAO_DIAS = 15;

export function supply(ctx: Ctx, i: Intervalo) {
  const { hoje } = ctx.ds;
  const ult30 = { inicio: addDays(hoje, -30), fim: addDays(hoje, -1) };
  const vendas30: Record<string, number> = {};
  for (const p of pedidos(ctx, ult30)) for (const it of p.itens) vendas30[it.sku] = (vendas30[it.sku] ?? 0) + it.qtd;
  const porSku: Record<string, { qtd: number; ultimaVenda: string; depositos: Record<string, number> }> = {};
  for (const e of ctx.ds.estoque) {
    const a = (porSku[e.sku] ??= { qtd: 0, ultimaVenda: e.ultimaVenda, depositos: {} });
    a.qtd += e.quantidade;
    a.depositos[e.deposito] = e.quantidade;
    if (e.ultimaVenda > a.ultimaVenda) a.ultimaVenda = e.ultimaVenda;
  }
  const itens = ctx.ds.produtos.map((p) => {
    const e = porSku[p.sku] ?? { qtd: 0, ultimaVenda: ctx.ds.inicioHistorico, depositos: {} };
    const vmd = (vendas30[p.sku] ?? 0) / 30;
    return {
      sku: p.sku, nome: p.nome, qtd: e.qtd, valor: e.qtd * p.custo, vmd,
      cobertura: vmd ? e.qtd / vmd : null,
      diasSemVenda: diffDays(e.ultimaVenda, hoje), depositos: e.depositos,
    };
  });
  const valor = soma(itens, (x) => x.valor);
  const cmvAno = resultado(ctx, { inicio: addDays(hoje, -364), fim: hoje }).cmv;
  const ativos = itens.filter((x) => x.diasSemVenda < 60);
  const comCobertura = ativos.filter((x) => x.cobertura !== null);
  const abc = porProduto(ctx, i);
  const totalAbc = soma(abc, (x) => x.receita);
  let acc = 0;
  const curva = abc.map((x) => {
    acc += x.receita;
    const share = totalAbc ? acc / totalAbc : 0;
    return { ...x, acumulado: share, classe: share <= 0.8 ? "A" : share <= 0.95 ? "B" : "C" };
  });
  const prep = pedidos(ctx, i).filter((p) => p.diasPreparacao !== undefined);
  const depositos: Record<string, number> = {};
  for (const e of ctx.ds.estoque) depositos[e.deposito] = (depositos[e.deposito] ?? 0) + e.quantidade * (ctx.custo[e.sku] ?? 0);
  return {
    itens,
    valor,
    unidades: soma(itens, (x) => x.qtd),
    coberturaMedia: comCobertura.length ? soma(comCobertura, (x) => (x.cobertura ?? 0) * x.vmd) / soma(comCobertura, (x) => x.vmd) : null,
    ruptura: ativos.length ? ativos.filter((x) => x.qtd === 0).length / ativos.length : 0,
    emRisco: ativos.filter((x) => x.cobertura !== null && x.cobertura < PRAZO_REPOSICAO_DIAS).sort((a, b) => (a.cobertura ?? 0) - (b.cobertura ?? 0)),
    parados: itens.filter((x) => x.diasSemVenda >= 60).sort((a, b) => b.valor - a.valor),
    giro: valor ? cmvAno / valor : null,
    curva,
    preparacao: prep.length ? soma(prep, (p) => p.diasPreparacao ?? 0) / prep.length : null,
    preparacaoPorCanal: Object.entries(
      prep.reduce<Record<string, { s: number; n: number }>>((m, p) => {
        const a = (m[p.lojaId] ??= { s: 0, n: 0 }); a.s += p.diasPreparacao ?? 0; a.n++; return m;
      }, {}),
    ).map(([id, v]) => ({ nome: NOME_CANAL[id] ?? id, dias: v.s / v.n })).sort((a, b) => b.dias - a.dias),
    depositos: Object.entries(depositos).map(([nome, valor]) => ({ nome, valor })),
  };
}

// ---------------------------------------------------------------- Finance

export const SALDO_INICIAL_CAIXA = 420000;

export function caixaDisponivel(ctx: Ctx): number {
  let s = SALDO_INICIAL_CAIXA;
  for (const l of ctx.ds.financeiro) if (l.pagoEm && l.pagoEm <= ctx.ds.hoje) s += l.tipo === "receber" ? l.valor : -l.valor;
  return s;
}

export function finance(ctx: Ctx, i: Intervalo) {
  const { hoje } = ctx.ds;
  const fin = ctx.ds.financeiro;
  const abertos = fin.filter((l) => !l.pagoEm);
  const vencidos = (t: "pagar" | "receber") => abertos.filter((l) => l.tipo === t && l.vencimento < hoje);
  const aVencer = (t: "pagar" | "receber", n: number) => abertos.filter((l) => l.tipo === t && l.vencimento >= hoje && l.vencimento <= addDays(hoje, n));
  const caixa = caixaDisponivel(ctx);
  // Fluxo previsto em semanas
  const semanas: { semana: string; entradas: number; saidas: number; saldo: number }[] = [];
  let saldo = caixa;
  for (let w = 0; w < 13; w++) {
    const ini = addDays(hoje, w * 7), fim = addDays(hoje, w * 7 + 6);
    const ent = soma(abertos.filter((l) => l.tipo === "receber" && dentro(l.vencimento, { inicio: ini, fim })), (l) => l.valor);
    const sai = soma(abertos.filter((l) => l.tipo === "pagar" && dentro(l.vencimento, { inicio: ini, fim })), (l) => l.valor);
    saldo += ent - sai;
    semanas.push({ semana: ini, entradas: ent, saidas: sai, saldo });
  }
  const res = resultado(ctx, i);
  const ult30 = { inicio: addDays(hoje, -29), fim: hoje };
  const r30 = resultado(ctx, ult30);
  const receberAberto = soma(abertos.filter((l) => l.tipo === "receber"), (l) => l.valor);
  const pagarFornecedor = soma(abertos.filter((l) => l.tipo === "pagar" && l.categoria === "Fornecedores"), (l) => l.valor);
  const est = supply(ctx, i).valor;
  const pmr = r30.receitaBruta ? (receberAberto / (r30.receitaBruta - r30.descontos - r30.devolucoes)) * 30 : 0;
  const die = r30.cmv ? (est / r30.cmv) * 30 : 0;
  const pmp = r30.cmv ? (pagarFornecedor / r30.cmv) * 30 : 0;
  const receberVencido = soma(vencidos("receber"), (l) => l.valor);
  return {
    res,
    caixa,
    semanas,
    saldo90: semanas[semanas.length - 1]?.saldo ?? caixa,
    pagarVencido: vencidos("pagar"),
    receberVencido: vencidos("receber"),
    pagar7: aVencer("pagar", 7),
    pagar30: aVencer("pagar", 30),
    receber7: aVencer("receber", 7),
    receber30: aVencer("receber", 30),
    ciclo: { pmr, die, pmp, total: pmr + die - pmp },
    inadimplencia: receberAberto ? receberVencido / receberAberto : 0,
    pontoEquilibrio: res.mcPct > 0 ? res.totalFixas / res.mcPct : null,
  };
}

/** Meta do período. No filtro "Mês", a barra usa a meta do mês inteiro e mostra o esperado até hoje à parte. */
export function metaPeriodo(ctx: Ctx, i: Intervalo, mes: boolean, area?: Area): { planejado: number; esperado?: number } {
  if (!mes) return { planejado: planejado(ctx, i, area) };
  const d = fromISO(i.fim);
  const y = d.getFullYear(), m = d.getMonth() + 1;
  const ini = `${y}-${String(m).padStart(2, "0")}-01`;
  const fim = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth(y, m)).padStart(2, "0")}`;
  // Esperado até hoje: dias completos + meio dia de hoje (os dados vão até o meio-dia).
  const esperado = planejado(ctx, { inicio: ini, fim: addDays(i.fim, -1) }, area) + planejado(ctx, { inicio: i.fim, fim: i.fim }, area) * 0.5;
  return { planejado: planejado(ctx, { inicio: ini, fim }, area), esperado };
}
