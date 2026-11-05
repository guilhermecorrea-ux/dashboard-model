// Shopify (site): pedidos pagos, itens, cupom, desconto, frete, reembolso, UTM, UF e data de despacho.
// Sem dados pessoais: o cliente vira um identificador anônimo.
import { exigir, opcional } from "../lib/env";
import { gravarCredencial, lerCredencial } from "../lib/db";
import { anonimo, buscar, dataBR, diasEntre, json, num } from "../lib/util";

const VERSAO = () => opcional("SHOPIFY_API_VERSION") ?? "2025-07";

export interface PedidoShopify {
  id: string;
  processedAt: string;
  displayFinancialStatus: string;
  discountCodes: string[];
  totalDiscountsSet: { shopMoney: { amount: string } };
  totalShippingPriceSet: { shopMoney: { amount: string } };
  totalRefundedSet: { shopMoney: { amount: string } };
  customer: { id: string } | null;
  shippingAddress: { provinceCode: string | null } | null;
  customerJourneySummary: { firstVisit: { utmParameters: { source: string | null } | null; source: string | null } | null } | null;
  fulfillments: { createdAt: string }[];
  lineItems: { nodes: { sku: string | null; quantity: number; originalUnitPriceSet: { shopMoney: { amount: string } } }[] };
}

/** Converte um pedido da Shopify para o formato padrão. Função pura (testada). */
export function mapearPedido(p: PedidoShopify, sal: string) {
  const itens = p.lineItems.nodes.map((l) => ({
    sku: l.sku || "sem-sku",
    qtd: l.quantity,
    preco_unit: num(l.originalUnitPriceSet.shopMoney.amount),
  }));
  const bruto = itens.reduce((s, i) => s + i.qtd * i.preco_unit, 0);
  const desp = p.fulfillments[0]?.createdAt;
  const utm = p.customerJourneySummary?.firstVisit?.utmParameters?.source ?? p.customerJourneySummary?.firstVisit?.source ?? null;
  return {
    id: `shopify:${p.id.split("/").pop()}`,
    fonte: "shopify",
    loja_id: "shopify",
    data: dataBR(p.processedAt),
    uf: p.shippingAddress?.provinceCode?.slice(0, 2).toUpperCase() ?? null,
    cliente_id: anonimo(p.customer?.id, sal),
    valor_bruto: Math.round(bruto * 100) / 100,
    desconto: num(p.totalDiscountsSet.shopMoney.amount),
    frete: num(p.totalShippingPriceSet.shopMoney.amount),
    reembolso: num(p.totalRefundedSet.shopMoney.amount),
    cupom: p.discountCodes[0] ?? null,
    origem: utm,
    dias_preparacao: desp ? Math.max(0, Math.round(diasEntre(p.processedAt, desp) * 100) / 100) : null,
    status: p.displayFinancialStatus.toLowerCase(),
    itens,
  };
}

const QUERY = `query($cursor: String, $q: String!) {
  orders(first: 100, after: $cursor, query: $q, sortKey: UPDATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id processedAt displayFinancialStatus discountCodes
      totalDiscountsSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      customer { id }
      shippingAddress { provinceCode }
      customerJourneySummary { firstVisit { source utmParameters { source } } }
      fulfillments(first: 1) { createdAt }
      lineItems(first: 100) { nodes { sku quantity originalUnitPriceSet { shopMoney { amount } } } }
    }
  }
}`;

/** Token de acesso: lido do banco (gravado na autorização). */
interface TokenShopify { access_token: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number }
interface CredShopify { access_token: string; refresh_token?: string; expira_em?: number; loja: string }

/** Token de acesso: lido do banco; renovado quando a Shopify entrega tokens que expiram. */
async function token(): Promise<string> {
  const c = await lerCredencial<CredShopify>("shopify");
  if (!c?.access_token) throw new Error("Shopify sem autorização. Rode: npm run autorizar -- shopify");
  if (c.expira_em && c.refresh_token && Date.now() > c.expira_em - 5 * 60_000) {
    const r = await buscar(`https://${exigir("SHOPIFY_LOJA")}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: exigir("SHOPIFY_CLIENT_ID"), client_secret: exigir("SHOPIFY_CLIENT_SECRET"), grant_type: "refresh_token", refresh_token: c.refresh_token }),
    });
    return (await salvarToken(await json<TokenShopify>(r, "Shopify renovar token"))).access_token;
  }
  return c.access_token;
}

export async function salvarToken(t: TokenShopify): Promise<CredShopify> {
  const cred: CredShopify = {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expira_em: t.expires_in ? Date.now() + t.expires_in * 1000 : undefined,
    loja: exigir("SHOPIFY_LOJA"),
  };
  await gravarCredencial("shopify", cred);
  return cred;
}

export async function trocarCodigo(codigo: string) {
  const r = await buscar(`https://${exigir("SHOPIFY_LOJA")}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: exigir("SHOPIFY_CLIENT_ID"), client_secret: exigir("SHOPIFY_CLIENT_SECRET"), code: codigo, expiring: 1 }),
  });
  return salvarToken(await json<TokenShopify>(r, "Shopify autorização"));
}

/** Pedidos pagos (inclui parcial e totalmente reembolsados) alterados desde a data. */
export async function buscarPedidos(desde: string) {
  const loja = exigir("SHOPIFY_LOJA");
  const sal = exigir("CLIENTE_SALT");
  const tk = await token();
  const q = `updated_at:>=${desde} AND (financial_status:paid OR financial_status:partially_refunded OR financial_status:refunded)`;
  const out: ReturnType<typeof mapearPedido>[] = [];
  let cursor: string | null = null;
  do {
    const r = await buscar(`https://${loja}/admin/api/${VERSAO()}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": tk },
      body: JSON.stringify({ query: QUERY, variables: { cursor, q } }),
    });
    const body = await json<{ data?: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: PedidoShopify[] } }; errors?: unknown }>(r, "Shopify");
    if (!body.data) throw new Error(`Shopify: ${JSON.stringify(body.errors).slice(0, 400)}`);
    out.push(...body.data.orders.nodes.map((n) => mapearPedido(n, sal)));
    cursor = body.data.orders.pageInfo.hasNextPage ? body.data.orders.pageInfo.endCursor : null;
  } while (cursor);
  return out;
}
