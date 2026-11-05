// GA4 pela Data API, com a conta de serviço da holding adicionada como Leitor na propriedade.
import { createSign } from "node:crypto";
import { exigir } from "../lib/env";
import { buscar, json, num } from "../lib/util";

const ORIGEM: Record<string, string> = {
  "Paid Search": "Pago", "Paid Social": "Pago", "Paid Shopping": "Pago", "Paid Video": "Pago", "Paid Other": "Pago",
  "Cross-network": "Pago", Display: "Pago", "Organic Search": "Orgânico", "Organic Shopping": "Orgânico", "Organic Video": "Orgânico",
  Direct: "Direto", "Organic Social": "Redes sociais", Email: "E-mail", Referral: "Outros", Affiliates: "Outros",
};

export const mapearOrigem = (canal: string) => ORIGEM[canal] ?? "Outros";
export const mapearDispositivo = (d: string) => (d === "desktop" ? "Computador" : "Celular");

async function tokenGoogle(): Promise<string> {
  const conta = JSON.parse(exigir("GA4_SERVICE_ACCOUNT_JSON")) as { client_email: string; private_key: string };
  const agora = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const corpo = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: conta.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: agora, exp: agora + 3600,
  })}`;
  const assinatura = createSign("RSA-SHA256").update(corpo).sign(conta.private_key, "base64url");
  const r = await buscar("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${corpo}.${assinatura}` }),
  });
  return (await json<{ access_token: string }>(r, "Google token")).access_token;
}

export function mapearRelatorio(rows: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]) {
  const acc = new Map<string, { data: string; origem: string; dispositivo: string; sessoes: number; carrinho: number; checkout: number; compras: number }>();
  for (const r of rows) {
    const [d, canal, disp] = r.dimensionValues.map((x) => x.value);
    const data = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const origem = mapearOrigem(canal), dispositivo = mapearDispositivo(disp);
    const k = `${data}|${origem}|${dispositivo}`;
    const [s, c, ch, co] = r.metricValues.map((x) => num(x.value));
    const a = acc.get(k) ?? { data, origem, dispositivo, sessoes: 0, carrinho: 0, checkout: 0, compras: 0 };
    a.sessoes += s; a.carrinho += c; a.checkout += ch; a.compras += co;
    acc.set(k, a);
  }
  return [...acc.values()];
}

export async function buscarTrafego(desde: string, ate: string) {
  const r = await buscar(`https://analyticsdata.googleapis.com/v1beta/properties/${exigir("GA4_PROPERTY_ID")}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await tokenGoogle()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: desde, endDate: ate }],
      dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }, { name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "addToCarts" }, { name: "checkouts" }, { name: "ecommercePurchases" }],
      limit: 100000,
    }),
  });
  const body = await json<{ rows?: Parameters<typeof mapearRelatorio>[0] }>(r, "GA4");
  return mapearRelatorio(body.rows ?? []);
}
