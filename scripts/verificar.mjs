#!/usr/bin/env node
// Confere o computador e o repositório antes de instalar. Sem dependências.
//   node scripts/verificar.mjs
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const ok = [], falta = [];
const rodar = (cmd) => { try { return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; } };
const checar = (nome, passou, comoResolver) => (passou ? ok : falta).push(passou ? nome : `${nome} — ${comoResolver}`);

const node = Number(process.versions.node.split(".")[0]);
checar(`Node.js ${process.versions.node}`, node >= 20, "instale o Node.js 20 ou mais novo em https://nodejs.org (versão LTS)");
checar("git", !!rodar("git --version"), "instale o Git em https://git-scm.com");
const gh = rodar("gh --version");
checar("GitHub CLI (gh)", !!gh, "instale em https://cli.github.com e rode: gh auth login");
const usuario = gh ? rodar("gh api user --jq .login") : null;
checar(`login no GitHub${usuario ? ` (${usuario})` : ""}`, !!usuario, "rode: gh auth login (escolha GitHub.com e HTTPS)");

const remoto = rodar("git remote get-url origin") ?? "";
const nomeRepo = remoto.replace(/\.git$/, "").split("/").pop() ?? "";
const ehModelo = nomeRepo === "dashboard-model";

console.log("\nVerificação para instalar o BMB Dashboard\n");
for (const x of ok) console.log(`  ✓ ${x}`);
for (const x of falta) console.log(`  ✗ ${x}`);
console.log("");
if (ehModelo) console.log("  → Esta pasta é o MODELO (dashboard-model). A instalação acontece numa cópia: dashboard-<empresa>.");
else if (nomeRepo) console.log(`  → Repositório da empresa: ${nomeRepo}`);
if (existsSync("sync/.env")) console.log("  → sync/.env já existe (instalação em andamento ou feita).");
console.log(falta.length ? `\n${falta.length} item(ns) para resolver antes de seguir.\n` : "\nTudo certo para instalar.\n");
process.exit(falta.length ? 1 : 0);
