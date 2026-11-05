// Autoriza Shopify ou Bling uma vez, na instalação. Abre a tela da plataforma, recebe o retorno
// num endereço local (http://localhost:8787/retorno) e guarda o token no banco da empresa.
//   npm run autorizar -- shopify
//   npm run autorizar -- bling
// O endereço de retorno precisa estar cadastrado no app da plataforma exatamente assim.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { exigir } from "../src/lib/env";
import * as shopify from "../src/conectores/shopify";
import * as bling from "../src/conectores/bling";

const fonte = process.argv[2];
const RETORNO = "http://localhost:8787/retorno";
const estado = randomBytes(16).toString("hex");

const url =
  fonte === "shopify"
    ? `https://${exigir("SHOPIFY_LOJA")}/admin/oauth/authorize?client_id=${exigir("SHOPIFY_CLIENT_ID")}` +
      `&scope=read_orders,read_products,read_fulfillments&redirect_uri=${encodeURIComponent(RETORNO)}&state=${estado}`
    : fonte === "bling"
      ? `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${exigir("BLING_CLIENT_ID")}&state=${estado}`
      : null;
if (!url) { console.error("Use: npm run autorizar -- shopify | bling"); process.exit(1); }

const servidor = createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", RETORNO);
  if (u.pathname !== "/retorno") { res.writeHead(404).end(); return; }
  if (u.searchParams.get("state") !== estado) { res.writeHead(400).end("Estado inválido. Rode o comando de novo."); return; }
  try {
    const codigo = u.searchParams.get("code") ?? "";
    if (fonte === "shopify") await shopify.trocarCodigo(codigo);
    else await bling.trocarCodigo(codigo, RETORNO);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end("<h2>Autorizado. Pode fechar esta aba e voltar ao terminal.</h2>");
    console.log(`✓ ${fonte} autorizado e salvo no banco.`);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end(String(e));
    console.error(`✗ ${e}`);
    process.exitCode = 1;
  }
  servidor.close();
});
servidor.listen(8787, () => {
  console.log(`Abra este link no navegador e clique em Autorizar:\n\n${url}\n`);
});
