// Autoriza Shopify ou Bling uma vez, na instalação, e guarda o token no banco da empresa.
//
// Funciona em dois jeitos:
//  • No computador:  npm run autorizar -- shopify
//      abre um endereço local (http://localhost:8787/retorno) e espera o clique em Autorizar.
//  • Em chat na nuvem (sem localhost):
//      1) npm run autorizar -- shopify --link        → mostra o link de autorização
//      2) a pessoa clica em Autorizar; o navegador abre uma página de erro em localhost
//         (normal) e ela copia o ENDEREÇO dessa página para o chat
//      3) npm run autorizar -- shopify --url="<endereço copiado>"
//
// O endereço de retorno http://localhost:8787/retorno precisa estar cadastrado no app da plataforma.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { exigir } from "../src/lib/env";
import * as shopify from "../src/conectores/shopify";
import * as bling from "../src/conectores/bling";

const [fonte, ...resto] = process.argv.slice(2);
const args = Object.fromEntries(resto.map((a) => { const i = a.indexOf("="); return i < 0 ? [a.replace(/^--/, ""), "1"] : [a.slice(2, i), a.slice(i + 1)]; }));
const RETORNO = "http://localhost:8787/retorno";
const ARQ_ESTADO = `.autorizar-${fonte}.estado`; // ignorado pelo git

if (fonte !== "shopify" && fonte !== "bling") {
  console.error("Use: npm run autorizar -- shopify | bling  [--link | --url=\"...\"]");
  process.exit(1);
}

function linkAutorizacao(estado: string) {
  return fonte === "shopify"
    ? `https://${exigir("SHOPIFY_LOJA")}/admin/oauth/authorize?client_id=${exigir("SHOPIFY_CLIENT_ID")}` +
        `&scope=read_orders,read_products,read_fulfillments&redirect_uri=${encodeURIComponent(RETORNO)}&state=${estado}`
    : `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${exigir("BLING_CLIENT_ID")}&state=${estado}`;
}

async function concluir(endereco: string, estadoEsperado: string) {
  const u = new URL(endereco, RETORNO);
  if (u.searchParams.get("error")) throw new Error(`A plataforma recusou: ${u.searchParams.get("error_description") ?? u.searchParams.get("error")}`);
  if (u.searchParams.get("state") !== estadoEsperado) throw new Error("O endereço não corresponde a este pedido de autorização. Gere um link novo com --link.");
  const codigo = u.searchParams.get("code");
  if (!codigo) throw new Error("O endereço colado não tem o código de autorização (?code=...).");
  if (fonte === "shopify") await shopify.trocarCodigo(codigo);
  else await bling.trocarCodigo(codigo, RETORNO);
  console.log(`✓ ${fonte} autorizado e salvo no banco.`);
}

if (args.url) {
  // Passo 3 do modo nuvem: troca o código do endereço colado pelo token.
  if (!existsSync(ARQ_ESTADO)) { console.error("Gere o link primeiro: npm run autorizar -- " + fonte + " --link"); process.exit(1); }
  const estado = readFileSync(ARQ_ESTADO, "utf8").trim();
  try { await concluir(args.url, estado); unlinkSync(ARQ_ESTADO); }
  catch (e) { console.error(`✗ ${e instanceof Error ? e.message : e}`); process.exit(1); }
} else if (args.link) {
  // Passo 1 do modo nuvem: só gera o link e guarda o estado para conferir depois.
  const estado = randomBytes(16).toString("hex");
  writeFileSync(ARQ_ESTADO, estado);
  console.log(`Abra este link, faça login e clique em ${fonte === "shopify" ? "Instalar" : "Autorizar"}:\n\n${linkAutorizacao(estado)}\n`);
  console.log("Depois o navegador vai mostrar uma página de erro em localhost. Isso é esperado:");
  console.log("copie o endereço completo dessa página e cole no chat.");
} else {
  // Modo computador: espera o retorno num servidor local.
  const estado = randomBytes(16).toString("hex");
  const servidor = createServer(async (req, res) => {
    const u = new URL(req.url ?? "/", RETORNO);
    if (u.pathname !== "/retorno") { res.writeHead(404).end(); return; }
    try {
      await concluir(u.toString(), estado);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end("<h2>Autorizado. Pode fechar esta aba e voltar ao Claude.</h2>");
    } catch (e) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end(String(e));
      console.error(`✗ ${e}`);
      process.exitCode = 1;
    }
    servidor.close();
  });
  servidor.listen(8787, () => console.log(`Abra este link no navegador e clique em Autorizar:\n\n${linkAutorizacao(estado)}\n`));
}
