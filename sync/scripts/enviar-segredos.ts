// Envia as chaves do sync/.env para os secrets do GitHub do repositório da empresa e liga o robô.
// O valor de cada chave vai direto do arquivo para o GitHub: não aparece no terminal nem no chat.
//   npm run segredos:enviar
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

if (!existsSync(".env")) { console.error("Não achei sync/.env."); process.exit(1); }
const nomes = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "CLIENTE_SALT", "SHOPIFY_LOJA", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET",
  "BLING_CLIENT_ID", "BLING_CLIENT_SECRET", "WINDSOR_API_KEY", "GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_JSON"];
const env: Record<string, string> = {};
for (const linha of readFileSync(".env", "utf8").split("\n")) {
  const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && m[2] && !m[2].startsWith("<")) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
let enviados = 0;
for (const n of nomes) {
  if (!env[n]) continue;
  const r = spawnSync("gh", ["secret", "set", n], { input: env[n], stdio: ["pipe", "ignore", "pipe"] });
  if (r.status !== 0) { console.error(`✗ ${n}: ${r.stderr.toString().trim()}`); process.exit(1); }
  console.log(`✓ ${n}`); enviados++;
}
if (env.WINDSOR_CAMPOS) spawnSync("gh", ["variable", "set", "WINDSOR_CAMPOS", "--body", env.WINDSOR_CAMPOS], { stdio: "inherit" });
const v = spawnSync("gh", ["variable", "set", "SYNC_ATIVO", "--body", "true"], { stdio: "inherit" });
console.log(v.status === 0 ? `\n${enviados} chaves enviadas e robô ligado (SYNC_ATIVO=true).` : "\nChaves enviadas, mas não consegui ligar o robô.");
