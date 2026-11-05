// Robô de sincronização. Uso:
//   npm run sync                      → completo (madrugada): últimos 7 dias de todas as fontes
//   npm run sync -- --modo=vendas     → rápido (12h, 16h, 20h): vendas de hoje e ontem (Shopify e Bling)
//   npm run sync -- --desde=2025-11-01 → carga de histórico (rode localmente, não no GitHub Actions)
//   npm run sync -- --fontes=shopify,bling
import { ler, gravar, gravarPedidos, registrar } from "./lib/db";
import { opcional } from "./lib/env";
import { hojeBR, somarDias } from "./lib/util";
import * as shopify from "./conectores/shopify";
import * as bling from "./conectores/bling";
import * as windsor from "./conectores/windsor";
import * as ga4 from "./conectores/ga4";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const modo: "completo" | "vendas" = args.modo === "vendas" ? "vendas" : "completo";
const hoje = hojeBR();
const ontem = somarDias(hoje, -1);
const desde = args.desde ?? (modo === "vendas" ? ontem : somarDias(hoje, -7));
const todas = modo === "vendas" ? ["shopify", "bling"] : ["shopify", "bling", "meta", "ga4"];
const fontes = (args.fontes?.split(",") ?? todas).filter((f: string) => {
  const precisa: Record<string, string> = { shopify: "SHOPIFY_LOJA", bling: "BLING_CLIENT_ID", meta: "WINDSOR_API_KEY", ga4: "GA4_PROPERTY_ID" };
  if (!opcional(precisa[f])) { console.log(`· ${f}: não configurada, pulando`); return false; }
  return true;
});

const tarefas: Record<string, () => Promise<[number, string]>> = {
  async shopify() {
    const ps = await shopify.buscarPedidos(desde);
    return [await gravarPedidos(ps), hoje];
  },
  async bling() {
    const ps = await bling.buscarPedidos(desde, hoje);
    let n = await gravarPedidos(ps);
    // Lojas novas entram como "não classificada" (o dashboard avisa para classificar)
    const conhecidas = new Set((await ler<{ id: string }>("lojas_canais", "select=id")).map((l) => l.id));
    const novas = [...new Set(ps.map((p) => p.loja_id))].filter((id) => !conhecidas.has(id));
    if (novas.length) await gravar("lojas_canais", await bling.buscarLojas(novas), "id");
    if (modo === "completo") {
      const prods = await bling.buscarProdutos();
      n += await gravar("produtos", prods.map(({ _id: _x, ...p }) => ({ ...p, atualizado_em: new Date().toISOString() })), "sku");
      const est = await bling.buscarEstoque(prods);
      n += await gravar("estoque", est.map((e) => ({ ...e, atualizado_em: new Date().toISOString() })), "sku,deposito");
      const cfg = await ler<{ chave: string; valor: unknown }>("config", "chave=eq.categorias_fixas");
      const fixas = (cfg[0]?.valor as string[] | undefined) ?? ["Folha e encargos", "Aluguel e condomínio", "Software e sistemas", "Serviços profissionais", "Utilidades"];
      n += await gravar("financeiro", await bling.buscarContas(somarDias(desde, -60), somarDias(hoje, 120), fixas), "id");
    }
    return [n, hoje];
  },
  async meta() {
    return [await gravar("midia_diaria", await windsor.buscarMidia(desde, ontem), "data,plataforma,campanha"), ontem];
  },
  async ga4() {
    return [await gravar("trafego_diario", await ga4.buscarTrafego(desde, ontem), "data,origem,dispositivo"), ontem];
  },
};

let falhas = 0;
for (const f of fontes) {
  const inicio = new Date();
  try {
    const [n, ate] = await tarefas[f]();
    await registrar(f, modo, inicio, true, n, ate);
    console.log(`✓ ${f}: ${n} linhas (desde ${desde})`);
  } catch (e) {
    falhas++;
    const msg = e instanceof Error ? e.message : String(e);
    await registrar(f, modo, inicio, false, 0, null, msg);
    console.error(`✗ ${f}: ${msg}`);
  }
}
// Falha → código de saída 1 → o GitHub Actions marca a execução e envia o e-mail de alerta.
process.exit(falhas ? 1 : 0);
