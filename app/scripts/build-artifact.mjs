// Gera um único HTML com CSS e JS embutidos (para publicar a demonstração como página).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const dir = new URL("../dist/assets/", import.meta.url);
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith(".js")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
const css = files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
const safeJs = js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const safeCss = css.replace(/<\/style/gi, "<\\/style");
const html = `<title>BMB Dashboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Outfit:wght@400;500;600&display=swap">
<style>${safeCss}</style>
<div id="root"></div>
<script type="module">${safeJs}</script>
`;
writeFileSync(new URL("../dist/bmb-dashboard.html", import.meta.url), html);
console.log("dist/bmb-dashboard.html", (html.length / 1024).toFixed(0), "KB");
