// Gera src/styles/tokens.css a partir de design-system/tokens.json (fonte única dos valores).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../design-system/tokens.json");
const out = resolve(here, "../src/styles/tokens.css");
const t = JSON.parse(readFileSync(src, "utf8"));
const themes = t.color.themes.map((x) => x.id);
const first = themes[0];
const val = (v, th) => (typeof v === "string" ? v : v[th] ?? v[first]);
const ref = (v) => v.replace(/\{([^}]+)\}/g, "var(--$1)");

let css = `/* BMB Dashboard — generated from tokens.json. Não edite: rode npm run tokens. */\n`;
for (const th of themes) {
  const sel = th === first ? `:root, [data-theme="${th}"]` : `[data-theme="${th}"]`;
  css += `${sel} {\n`;
  for (const k of t.color.tokens) css += `  --${k.name}: ${ref(val(k.value, th))};\n`;
  for (const k of t.shadow?.tokens ?? []) css += `  --${k.name}: ${val(k.value, th)};\n`;
  css += `  color-scheme: ${th === "light" ? "light" : "dark"};\n}\n`;
}
css += `:root {\n`;
for (const fam of ["spacing", "radius"]) for (const k of t[fam].tokens) css += `  --${k.name}: ${k.value};\n`;
for (const [k, v] of Object.entries(t.type.families)) css += `  --font-${k}: ${v};\n`;
css += `}\n`;
for (const g of t.type.groups)
  for (const s of g.styles)
    css += `.${s.name} { font-family: var(--font-${s.family ?? g.family}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ""} }\n`;
writeFileSync(out, css);
console.log(`tokens.css gerado (${t.color.tokens.length} cores, ${themes.length} temas)`);
