// Confere cada fonte configurada puxando os últimos 3 dias, sem gravar nada.
// Use na instalação para comparar os totais com o painel de cada plataforma.
import { opcional } from "../src/lib/env";
import { hojeBR, somarDias } from "../src/lib/util";
import * as shopify from "../src/conectores/shopify";
import * as bling from "../src/conectores/bling";
import * as windsor from "../src/conectores/windsor";
import * as ga4 from "../src/conectores/ga4";

const hoje = hojeBR(), desde = somarDias(hoje, -3), ontem = somarDias(hoje, -1);
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const testes: [string, string, () => Promise<string>][] = [
  ["Shopify", "SHOPIFY_LOJA", async () => {
    const ps = (await shopify.buscarPedidos(desde)).filter((p) => p.data >= desde);
    return `${ps.length} pedidos pagos desde ${desde} · ${brl(ps.reduce((s, p) => s + p.valor_bruto - p.desconto - p.reembolso, 0))}`;
  }],
  ["Bling", "BLING_CLIENT_ID", async () => {
    const ps = await bling.buscarPedidos(desde, hoje);
    const lojas = [...new Set(ps.map((p) => p.loja_id))];
    return `${ps.length} pedidos desde ${desde} · ${brl(ps.reduce((s, p) => s + p.valor_bruto - p.desconto, 0))} · lojas: ${lojas.join(", ")}`;
  }],
  ["Meta (Windsor)", "WINDSOR_API_KEY", async () => {
    const ls = await windsor.buscarMidia(desde, ontem);
    return `${ls.length} linhas · investimento ${brl(ls.reduce((s, l) => s + l.investimento, 0))}`;
  }],
  ["GA4", "GA4_PROPERTY_ID", async () => {
    const ls = await ga4.buscarTrafego(desde, ontem);
    return `${ls.reduce((s, l) => s + l.sessoes, 0)} sessões desde ${desde}`;
  }],
];
for (const [nome, chave, f] of testes) {
  if (!opcional(chave)) { console.log(`· ${nome}: não configurada`); continue; }
  try { console.log(`✓ ${nome}: ${await f()}`); } catch (e) { console.log(`✗ ${nome}: ${e instanceof Error ? e.message : e}`); }
}
