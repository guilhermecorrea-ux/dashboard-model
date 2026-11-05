// Lê variáveis de ambiente (.env localmente, secrets no GitHub Actions).
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env")) {
  for (const linha of readFileSync(".env", "utf8").split("\n")) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

export function exigir(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Falta a variável ${nome}. Veja sync/.env.exemplo.`);
  return v;
}

export const opcional = (nome: string) => process.env[nome] || undefined;
