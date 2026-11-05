// Prepara o banco Supabase da empresa.
//   npm run banco:aplicar     → cria/atualiza tabelas e permissões (supabase/migrations/*.sql)
//   npm run banco:configurar -- --empresa="Vitanuts" --admin=fulano@empresa.com.br [--aliquota=0.092] [--saldo=420000]
//     → grava a configuração, o primeiro administrador e gera o token do script do Google Ads.
// Precisa de DATABASE_URL (Supabase → Project Settings → Database → Connection string, modo "Session").
import { readdirSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { exigir } from "../src/lib/env";
import { hojeBR, somarDias } from "../src/lib/util";

const [acao, ...resto] = process.argv.slice(2);
const args = Object.fromEntries(resto.map((a) => a.replace(/^--/, "").split("=")));
const url = exigir("DATABASE_URL");
const db = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await db.connect();

try {
  if (acao === "aplicar") {
    const pasta = new URL("../../supabase/migrations/", import.meta.url);
    for (const f of readdirSync(pasta).filter((x) => x.endsWith(".sql")).sort()) {
      await db.query(readFileSync(new URL(f, pasta), "utf8"));
      console.log(`✓ ${f}`);
    }
  } else if (acao === "configurar") {
    const empresa = args.empresa ?? exigir("EMPRESA");
    const admin = String(args.admin ?? "").toLowerCase();
    if (!admin.includes("@")) throw new Error("Informe --admin=email@empresa.com.br");
    const config: Record<string, unknown> = {
      empresa,
      aliquota_impostos: Number(args.aliquota ?? 0.09),
      saldo_inicial_caixa: Number(args.saldo ?? 0),
      inicio_historico: args.inicio ?? somarDias(hojeBR(), -365),
      categorias_fixas: (args.fixas ?? "Folha e encargos,Aluguel e condomínio,Software e sistemas,Serviços profissionais,Utilidades").split(","),
    };
    for (const [chave, valor] of Object.entries(config))
      await db.query("insert into public.config (chave, valor) values ($1, $2) on conflict (chave) do update set valor = excluded.valor", [chave, JSON.stringify(valor)]);
    await db.query("insert into public.usuarios_perfis (email, perfil) values ($1, 'admin') on conflict (email) do update set perfil = 'admin'", [admin]);
    const token = randomBytes(24).toString("base64url");
    await db.query("select public.definir_token_google_ads($1)", [token]);
    console.log(`✓ Configuração de ${empresa} gravada; ${admin} é administrador.`);
    console.log(`\nToken do Google Ads Script (cole em TOKEN_ENTRADA; não fica salvo em lugar nenhum):\n${token}\n`);
  } else {
    console.log("Use: npm run banco:aplicar | npm run banco:configurar -- --empresa=... --admin=...");
  }
} finally {
  await db.end();
}
