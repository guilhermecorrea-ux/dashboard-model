// Cenário SIMULADO de uma empresa exemplo: 12 meses de histórico gerados de forma determinística
// (mesma semente = mesmos números). Serve para desenvolver e demonstrar o dashboard
// antes de os conectores reais estarem ligados. Nenhum número aqui é real.

import { addDays, diffDays, fromISO, monthKey, toISO } from "../../lib/dates";
import type {
  Dataset, Estoque, LancamentoFinanceiro, LojaCanal, Meta, MidiaDiaria, Pedido, Produto, TrafegoDiario,
} from "../types";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUTOS: (Produto & { peso: number; paradoDesde?: number })[] = [
  { sku: "VN-MIX500", nome: "Mix de Castanhas 500 g", preco: 89.9, custo: 41.2, categoria: "Mix", peso: 18 },
  { sku: "VN-CPA250", nome: "Castanha-do-pará 250 g", preco: 49.9, custo: 21.4, categoria: "Castanhas", peso: 16 },
  { sku: "VN-AMD400", nome: "Amêndoas torradas 400 g", preco: 74.9, custo: 36.8, categoria: "Castanhas", peso: 12 },
  { sku: "VN-PAM1K", nome: "Pasta de amendoim 1 kg", preco: 59.9, custo: 27.9, categoria: "Pastas", peso: 11 },
  { sku: "VN-CAJ500", nome: "Castanha de caju 500 g", preco: 84.9, custo: 43.5, categoria: "Castanhas", peso: 10 },
  { sku: "VN-NOZ250", nome: "Nozes chilenas 250 g", preco: 54.9, custo: 27.1, categoria: "Castanhas", peso: 7 },
  { sku: "VN-GRA800", nome: "Granola sem açúcar 800 g", preco: 44.9, custo: 18.2, categoria: "Granolas", peso: 8 },
  { sku: "VN-PIS200", nome: "Pistache torrado 200 g", preco: 69.9, custo: 38.9, categoria: "Castanhas", peso: 5 },
  { sku: "VN-MAC250", nome: "Macadâmia 250 g", preco: 79.9, custo: 42.6, categoria: "Castanhas", peso: 4 },
  { sku: "VN-PCJ500", nome: "Pasta de castanha de caju 500 g", preco: 64.9, custo: 31.5, categoria: "Pastas", peso: 4 },
  { sku: "VN-KIT3", nome: "Kit Degustação 3 sabores", preco: 129.9, custo: 58.4, categoria: "Kits", peso: 3 },
  { sku: "VN-TRP1K", nome: "Mix Tropical 1 kg", preco: 109.9, custo: 52.3, categoria: "Mix", peso: 2, paradoDesde: 78 },
];

const UFS: [string, number][] = [
  ["SP", 33], ["RJ", 13], ["MG", 11], ["PR", 6], ["RS", 5.5], ["SC", 5], ["BA", 4], ["DF", 3.5], ["GO", 3],
  ["PE", 3], ["ES", 2], ["CE", 2], ["MS", 1.2], ["MT", 1.2], ["PA", 1.1], ["AM", 0.8], ["RN", 0.6], ["PB", 0.6],
  ["AL", 0.5], ["SE", 0.4], ["MA", 0.5], ["PI", 0.4], ["TO", 0.3], ["RO", 0.3], ["AC", 0.1], ["AP", 0.1], ["RR", 0.1],
];

const LOJAS: LojaCanal[] = [
  { id: "bl-site", nome: "Loja Virtual (Shopify)", classe: "site", espelhaSite: true },
  { id: "bl-ml", nome: "Mercado Livre — Loja Oficial", classe: "marketplace" },
  { id: "bl-shopee", nome: "Shopee", classe: "marketplace" },
  { id: "bl-amazon", nome: "Amazon Seller", classe: "marketplace" },
  { id: "bl-atacado", nome: "Atacado e Representantes", classe: "b2b" },
  { id: "bl-magalu", nome: "Magalu Marketplace", classe: "nao_classificada" },
];

const CLIENTES_B2B = [
  "Empório Verde Ltda", "Mercado Natural Campinas", "Rede Saúde & Grãos", "Casa do Granel BH", "Supermercados Ideal",
  "Nutri Box Assinaturas", "Empório Santa Luzia", "Hortifruti Bom Preço", "Cafeteria Grão Fino", "Academia Corpo Ativo",
  "Grãos do Sul Distribuidora", "Mercearia Paulista", "Zona Fit Suplementos", "Armazém Mineiro", "Natural da Terra Curitiba",
  "Vida Leve Lojas", "Empório Ribeirão", "Distribuidora Litoral", "Mundo Verde Franquia 12", "Box Saudável Recife",
];
const VENDEDORES = ["Carla Mendes", "Rafael Souza", "Representação Sul"];

export function gerarDataset(hoje = toISO(new Date())): Dataset {
  const r = rng(20261104);
  const pick = <T,>(arr: [T, number][]) => {
    const tot = arr.reduce((s, x) => s + x[1], 0);
    let v = r() * tot;
    for (const [k, w] of arr) { v -= w; if (v <= 0) return k; }
    return arr[arr.length - 1][0];
  };
  const inicio = addDays(hoje, -365);
  const pedidos: Pedido[] = [];
  const midia: MidiaDiaria[] = [];
  const trafego: TrafegoDiario[] = [];
  const vendaUltima: Record<string, string> = {};
  const vendas30: Record<string, number> = {};
  const clientesSite: string[] = [];
  let seq = 0;

  const ativos = (dia: string) =>
    PRODUTOS.filter((p) => !(p.paradoDesde && diffDays(dia, hoje) < p.paradoDesde));

  const itens = (dia: string, nMax: number, qtdMax: number) => {
    const lista = ativos(dia).map((p) => [p, p.peso] as [Produto, number]);
    const n = 1 + Math.floor(r() * nMax);
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = pick(lista);
      const qtd = 1 + Math.floor(r() * qtdMax);
      out.push({ sku: p.sku, qtd, precoUnit: p.preco });
      vendaUltima[p.sku] = dia;
      if (diffDays(dia, hoje) < 30) vendas30[p.sku] = (vendas30[p.sku] ?? 0) + qtd;
    }
    return out;
  };

  // B2B: carteira com entradas e saídas de clientes ao longo do ano
  const carteira = CLIENTES_B2B.map((nome, i) => ({
    nome,
    id: `b2b-${i}`,
    entra: i < 14 ? 0 : 120 + i * 12, // dias após o início
    sai: i === 3 || i === 7 ? 250 : i === 11 ? 300 : 9999,
    freq: 10 + Math.floor(r() * 25),
    vendedor: VENDEDORES[i % 3],
    prazo: [28, 42, 56][i % 3],
    porte: 0.6 + r() * 1.6,
  }));
  const ultimaB2B: Record<string, number> = {};

  for (let d = 0; d <= 365; d++) {
    const dia = addDays(inicio, d);
    const dt = fromISO(dia);
    const dow = dt.getDay();
    const mes = dt.getMonth() + 1;
    const parcial = dia === hoje ? 0.5 : 1;
    const tendencia = 1 + d / 365 * 0.28;
    const semana = [0.86, 1.12, 1.06, 1.02, 0.98, 0.95, 0.84][dow];
    const sazonal = ({ 1: 0.82, 2: 0.88, 3: 0.95, 7: 0.97, 11: 1.18, 12: 1.32 } as Record<number, number>)[mes] ?? 1;
    const bf = mes === 11 && dt.getDate() >= 24 && dt.getDate() <= 30 ? 2.1 : 1;
    const f = tendencia * semana * sazonal * bf * parcial;
    const ruido = () => 0.85 + r() * 0.3;

    // Site (Shopify)
    const nSite = Math.round(68 * f * ruido());
    for (let i = 0; i < nSite; i++) {
      const volta = clientesSite.length > 50 && r() < 0.33;
      const clienteId = volta ? clientesSite[Math.floor(r() * clientesSite.length)] : `c${clientesSite.push(`c${clientesSite.length}`) - 1}`;
      const its = itens(dia, 3, 2);
      const bruto = its.reduce((s, x) => s + x.qtd * x.precoUnit, 0);
      const usaCupom = r() < 0.27;
      const cupom = usaCupom ? (bf > 1 ? "BLACK20" : volta ? "VOLTA15" : pick([["PRIMEIRA10", 3], ["FRETEGRATIS", 2]])) : undefined;
      const descPct = cupom === "BLACK20" ? 0.2 : cupom === "VOLTA15" ? 0.15 : cupom === "PRIMEIRA10" ? 0.1 : 0;
      const desconto = Math.round(bruto * descPct * 100) / 100;
      const frete = cupom === "FRETEGRATIS" || bruto > 199 ? 0 : 18.9;
      pedidos.push({
        id: `s${++seq}`, fonte: "shopify", lojaId: "shopify", data: dia, uf: pick(UFS), clienteId, clienteNovo: !volta,
        valorBruto: bruto, desconto, frete, reembolso: r() < 0.015 ? bruto - desconto : 0, cupom,
        origem: pick([["Pago", 40], ["Orgânico", 30], ["Direto", 15], ["Redes sociais", 10], ["E-mail", 5]]),
        itens: its, diasPreparacao: 0.6 + r() * 2.2,
      });
    }

    // Marketplaces (Bling)
    const mkts: [string, number, number][] = [["bl-ml", 58, 2], ["bl-shopee", 31, 1], ["bl-amazon", 12, 2]];
    if (diffDays(dia, hoje) < 10) mkts.push(["bl-magalu", 6, 1]);
    for (const [loja, base, qmax] of mkts) {
      const n = Math.round(base * f * ruido());
      for (let i = 0; i < n; i++) {
        const its = itens(dia, 2, qmax);
        const bruto = its.reduce((s, x) => s + x.qtd * x.precoUnit, 0);
        pedidos.push({
          id: `m${++seq}`, fonte: "bling", lojaId: loja, data: dia, uf: pick(UFS), clienteId: `mk${seq}`, clienteNovo: true,
          valorBruto: bruto, desconto: 0, frete: 0, reembolso: r() < 0.02 ? bruto : 0, itens: its,
          diasPreparacao: 0.4 + r() * 1.4,
        });
      }
    }

    // Espelho do site no Bling (é excluído da receita pela regra de classificação)
    // Não geramos linhas duplicadas aqui para manter o volume leve; a regra está em metrics/receita.ts.

    // B2B (Bling)
    if (dow !== 0 && dow !== 6) {
      for (const c of carteira) {
        if (d < c.entra || d > c.sai) continue;
        const ult = ultimaB2B[c.id] ?? c.entra - Math.floor(r() * c.freq);
        if (d - ult < c.freq * (0.8 + r() * 0.4)) continue;
        ultimaB2B[c.id] = d;
        const its = itens(dia, 6, 24);
        const bruto = its.reduce((s, x) => s + x.qtd * x.precoUnit * 0.72, 0) * c.porte;
        pedidos.push({
          id: `b${++seq}`, fonte: "bling", lojaId: "bl-atacado", data: dia, uf: pick([["SP", 50], ["MG", 15], ["PR", 12], ["RJ", 10], ["PE", 5], ["SC", 8]]),
          clienteId: c.id, clienteNovo: false, clienteNome: c.nome, vendedor: c.vendedor, prazoRecebimentoDias: c.prazo,
          valorBruto: Math.round(bruto * 100) / 100, desconto: 0, frete: 0, reembolso: 0,
          itens: its.map((x) => ({ ...x, precoUnit: Math.round(x.precoUnit * 0.72 * c.porte * 100) / 100 })), diasPreparacao: 1 + r() * 3,
        });
      }
    }

    // Mídia e tráfego vão até ontem (Meta via Windsor e GA4 atualizam 1x por dia)
    if (dia < hoje) {
      const recSite = nSite * 205;
      const camp: [MidiaDiaria["plataforma"], string, number, number][] = [
        ["meta", "Prospecção | Advantage+", 0.3, 2.6], ["meta", "Remarketing 7 dias", 0.12, 5.8], ["meta", "Catálogo | DPA", 0.16, 3.9],
        ["google_ads", "PMax | Todos os produtos", 0.2, 4.1], ["google_ads", "Search | Marca", 0.07, 11.5],
        ["google_ads", "Search | Castanhas", 0.08, 3.2], ["google_ads", "Shopping | Catálogo", 0.07, 4.4],
      ];
      if (bf > 1) camp.push(["meta", "Black Friday | Ofertas", 0.18, 4.6]);
      const verba = recSite * 0.2;
      for (const [plataforma, campanha, share, roas] of camp) {
        const inv = Math.round(verba * share * ruido() * 100) / 100;
        const rec = inv * roas * ruido();
        midia.push({ data: dia, plataforma, campanha, investimento: inv, receitaAtribuida: Math.round(rec * 100) / 100, conversoes: Math.round(rec / 205) });
      }
      const sess = nSite / 0.0185;
      const origens: [TrafegoDiario["origem"], number, number][] = [
        ["Pago", 0.42, 0.017], ["Orgânico", 0.28, 0.021], ["Direto", 0.14, 0.024], ["Redes sociais", 0.11, 0.009], ["E-mail", 0.05, 0.031],
      ];
      for (const [origem, share, conv] of origens)
        for (const [dispositivo, ds, dc] of [["Celular", 0.72, 0.85], ["Computador", 0.28, 1.4]] as const) {
          const s = Math.round(sess * share * ds * ruido());
          const compras = Math.round(s * conv * dc);
          trafego.push({ data: dia, origem, dispositivo, sessoes: s, carrinho: Math.round(s * 0.082), checkout: Math.round(s * 0.036), compras });
        }
    }
  }

  // Estoque atual por depósito
  const estoque: Estoque[] = [];
  const cobertura: Record<string, number> = { "VN-PIS200": 4, "VN-CAJ500": 9, "VN-MAC250": 0, "VN-NOZ250": 13, "VN-TRP1K": 140 };
  for (const p of PRODUTOS) {
    const diario = (vendas30[p.sku] ?? 0) / 30;
    const dias = cobertura[p.sku] ?? 22 + Math.floor(r() * 50);
    const total = p.sku === "VN-TRP1K" ? 310 : Math.round(diario * dias);
    estoque.push({ sku: p.sku, deposito: "CD Principal", quantidade: Math.round(total * 0.78), ultimaVenda: vendaUltima[p.sku] ?? inicio });
    estoque.push({ sku: p.sku, deposito: "Full Mercado Livre", quantidade: total - Math.round(total * 0.78), ultimaVenda: vendaUltima[p.sku] ?? inicio });
  }

  // Financeiro (contas a pagar e a receber, 12 meses para trás e 3 para frente)
  const financeiro: LancamentoFinanceiro[] = [];
  let fid = 0;
  const lanc = (l: Omit<LancamentoFinanceiro, "id">) => financeiro.push({ id: `f${++fid}`, ...l });
  for (const p of pedidos) {
    if (p.lojaId !== "bl-atacado") continue;
    const venc = addDays(p.data, p.prazoRecebimentoDias ?? 28);
    const atrasado = r() < 0.07;
    lanc({ tipo: "receber", categoria: "Vendas B2B", descricao: p.clienteNome ?? "Cliente B2B", valor: p.valorBruto, vencimento: venc,
      pagoEm: venc < hoje && !atrasado ? addDays(venc, Math.floor(r() * 4)) : undefined, fixa: false });
  }
  // Repasses semanais de site e marketplaces (D+14)
  const porSemana: Record<string, number> = {};
  for (const p of pedidos) {
    if (p.lojaId === "bl-atacado") continue;
    const semana = addDays(p.data, 14 - fromISO(p.data).getDay());
    porSemana[`${p.lojaId}|${semana}`] = (porSemana[`${p.lojaId}|${semana}`] ?? 0) + (p.valorBruto - p.desconto - p.reembolso) * 0.86;
  }
  const nomeRepasse: Record<string, string> = { shopify: "Repasse Shopify Payments", "bl-ml": "Repasse Mercado Livre", "bl-shopee": "Repasse Shopee", "bl-amazon": "Repasse Amazon", "bl-magalu": "Repasse Magalu" };
  for (const [k, v] of Object.entries(porSemana)) {
    const [loja, venc] = k.split("|");
    lanc({ tipo: "receber", categoria: "Repasses de vendas", descricao: nomeRepasse[loja], valor: Math.round(v * 100) / 100, vencimento: venc, pagoEm: venc < hoje ? venc : undefined, fixa: false });
  }
  // Despesas
  const mesesFin: string[] = [];
  for (let m = -12; m <= 3; m++) { const d = fromISO(hoje); d.setDate(1); d.setMonth(d.getMonth() + m); mesesFin.push(toISO(d).slice(0, 7)); }
  const receitaMes: Record<string, number> = {};
  const cmvMes: Record<string, number> = {};
  const custo = Object.fromEntries(PRODUTOS.map((p) => [p.sku, p.custo]));
  for (const p of pedidos) {
    const k = monthKey(p.data);
    receitaMes[k] = (receitaMes[k] ?? 0) + p.valorBruto - p.desconto - p.reembolso;
    cmvMes[k] = (cmvMes[k] ?? 0) + p.itens.reduce((s, i) => s + i.qtd * custo[i.sku], 0);
  }
  const midiaMes: Record<string, number> = {};
  for (const m of midia) midiaMes[monthKey(m.data)] = (midiaMes[monthKey(m.data)] ?? 0) + m.investimento;
  const ultimoReal = monthKey(hoje);
  for (const k of mesesFin) {
    const base = receitaMes[k] ?? receitaMes[ultimoReal] * 1.05;
    const pago = (dia: string) => (dia < hoje ? (r() < 0.985 ? dia : undefined) : undefined);
    const fixas: [string, string, number, number][] = [
      ["Folha e encargos", "Folha de pagamento", 96000, 5], ["Aluguel e condomínio", "Aluguel CD", 18500, 10],
      ["Software e sistemas", "Shopify, Bling e ferramentas", 6400, 15], ["Serviços profissionais", "Contabilidade", 4200, 20],
      ["Utilidades", "Energia e internet", 3300, 12],
    ];
    for (const [cat, desc, v, dia] of fixas) {
      const venc = `${k}-${String(dia).padStart(2, "0")}`;
      lanc({ tipo: "pagar", categoria: cat, descricao: desc, valor: Math.round(v * (0.97 + r() * 0.06)), vencimento: venc, pagoEm: pago(venc), fixa: true });
    }
    for (const sem of [3, 10, 17, 24]) {
      const venc = `${k}-${String(sem).padStart(2, "0")}`;
      lanc({ tipo: "pagar", categoria: "Fornecedores", descricao: "Compra de mercadoria", valor: Math.round((cmvMes[k] ?? base * 0.46) / 4 * (0.9 + r() * 0.2)), vencimento: venc, pagoEm: pago(venc), fixa: false });
      lanc({ tipo: "pagar", categoria: "Frete e logística", descricao: "Transportadora e Correios", valor: Math.round(base * 0.045 / 4 * (0.9 + r() * 0.2)), vencimento: venc, pagoEm: pago(venc), fixa: false });
    }
    lanc({ tipo: "pagar", categoria: "Mídia paga", descricao: "Meta Ads e Google Ads", valor: Math.round(midiaMes[k] ?? base * 0.1), vencimento: `${k}-08`, pagoEm: pago(`${k}-08`), fixa: false });
    lanc({ tipo: "pagar", categoria: "Impostos", descricao: "Simples Nacional / ICMS", valor: Math.round(base * 0.092), vencimento: `${k}-20`, pagoEm: pago(`${k}-20`), fixa: false });
  }

  // Metas mensais por área: 2025 (ano anterior, preenchido manualmente) e 2026
  const recArea: Record<string, number> = {};
  for (const p of pedidos) {
    const area = p.lojaId === "bl-atacado" ? "B2B" : "DTC";
    const k = `${monthKey(p.data)}|${area}`;
    recArea[k] = (recArea[k] ?? 0) + p.valorBruto - p.desconto - p.reembolso;
  }
  const metas: Meta[] = [];
  const anoAtual = fromISO(hoje).getFullYear();
  const mesInicio = monthKey(inicio);
  const mesAtual = monthKey(hoje);
  const mesAnterior = monthKey(addDays(`${mesAtual}-01`, -1));
  for (const ano of [anoAtual - 1, anoAtual]) {
    for (let m = 1; m <= 12; m++) {
      const mk = `${ano}-${String(m).padStart(2, "0")}`;
      for (const area of ["DTC", "B2B"] as const) {
        const completo = mk > mesInicio && mk < mesAtual && recArea[`${mk}|${area}`];
        const base = recArea[`${mesAnterior}|${area}`] ?? (area === "DTC" ? 900000 : 140000);
        const sazon = m === 11 ? 1.3 : m === 12 ? 1.4 : m <= 2 ? 0.85 : 1;
        const ref = completo ? recArea[`${mk}|${area}`] : base * sazon * (mk < mesAtual ? 0.8 : 1.04);
        metas.push({ ano, mes: m, area, valor: Math.round((ref * (0.93 + r() * 0.15)) / 1000) * 1000 });
      }
    }
  }

  const ontem = addDays(hoje, -1);
  const agora = `${hoje}T12:04:00`;
  return {
    empresa: "Empresa Exemplo",
    hoje,
    inicioHistorico: inicio,
    lojas: LOJAS,
    produtos: PRODUTOS.map(({ peso: _p, paradoDesde: _d, ...p }) => p),
    pedidos,
    estoque,
    midia,
    trafego,
    financeiro,
    metas,
    aliquotaImpostos: 0.092,
    sync: [
      { fonte: "shopify", ultimaExecucao: agora, ok: true, dadosAte: hoje },
      { fonte: "bling", ultimaExecucao: agora, ok: true, dadosAte: hoje },
      { fonte: "meta", ultimaExecucao: `${hoje}T06:10:00`, ok: true, dadosAte: ontem },
      { fonte: "google_ads", ultimaExecucao: `${hoje}T06:02:00`, ok: true, dadosAte: ontem },
      { fonte: "ga4", ultimaExecucao: `${hoje}T06:15:00`, ok: true, dadosAte: ontem },
    ],
  };
}
