import type { ReactNode } from "react";
import { Boxes, Building2, LayoutGrid, LogOut, Moon, ShoppingBag, SlidersHorizontal, Sun, Target, Wallet } from "lucide-react";
import { PERFIS, useApp, type FaceId } from "../state/app";
import { COMPARACOES, PERIODOS } from "../metrics/periodo";
import { pedidosNaoClassificados, type Recorte } from "../metrics";
import { fmtDia } from "../lib/dates";
import { AlertBanner } from "./ui";
import { MODO_DADOS } from "../data/provider";

export const FACES: { id: FaceId; nome: string; curto: string; icone: ReactNode }[] = [
  { id: "overview", nome: "Overview", curto: "Overview", icone: <LayoutGrid /> },
  { id: "dtc", nome: "Performance DTC", curto: "DTC", icone: <ShoppingBag /> },
  { id: "b2b", nome: "Performance B2B", curto: "B2B", icone: <Building2 /> },
  { id: "supply", nome: "Supply Chain", curto: "Supply", icone: <Boxes /> },
  { id: "finance", nome: "Finance", curto: "Finance", icone: <Wallet /> },
  { id: "metas", nome: "Metas", curto: "Metas", icone: <Target /> },
  { id: "ajustes", nome: "Ajustes", curto: "Ajustes", icone: <SlidersHorizontal /> },
];

export function SidebarNav() {
  const { face, irPara, usuario } = useApp();
  const permitidas = PERFIS.find((p) => p.id === usuario.perfil)!.faces;
  const item = (f: (typeof FACES)[number]) =>
    permitidas.includes(f.id) && (
      <a key={f.id} href={`#${f.id}`} aria-current={face === f.id ? "page" : undefined}
        onClick={(e) => { e.preventDefault(); irPara(f.id); }}>
        <span className="ico">{f.icone}</span>{f.curto}
      </a>
    );
  return (
    <nav className="bmb-rail rail-app" aria-label="Faces do dashboard">
      <div className="bmb-rail-logo">BMB</div>
      {FACES.slice(0, 5).map(item)}
      {(permitidas.includes("metas") || permitidas.includes("ajustes")) && <div className="bmb-rail-sep" />}
      {FACES.slice(5).map(item)}
    </nav>
  );
}

const RECORTES: { id: Recorte; rotulo: string }[] = [
  { id: "tudo", rotulo: "Tudo" }, { id: "site", rotulo: "Site" }, { id: "marketplace", rotulo: "Marketplaces" }, { id: "b2b", rotulo: "B2B" },
];

export function FaceHeader({ titulo, filtros = true, recorte = false }: { titulo: string; filtros?: boolean; recorte?: boolean }) {
  const app = useApp();
  const { ds, tema, setTema, usuario, sair } = app;
  return (
    <header className="face-header">
      <div className="face-titulo">
        <span className="bmb-label">{ds.empresa}{MODO_DADOS === "simulado" ? " · dados simulados" : ""}</span>
        <h1 className="page-title">{titulo}</h1>
      </div>
      <div className="face-acoes">
        {filtros && (
          <div className="bmb-pills" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p.id} className="bmb-pill" aria-pressed={app.periodo === p.id} onClick={() => app.setPeriodo(p.id)}>{p.rotulo}</button>
            ))}
            <label className="bmb-pill bmb-pill-compare select-pill">
              <span className="sr-only">Comparação</span>
              <select value={app.comparacao} onChange={(e) => app.setComparacao(e.target.value as typeof app.comparacao)}>
                {COMPARACOES.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
              </select>
            </label>
          </div>
        )}
        {filtros && recorte && (
          <div className="bmb-pills" role="group" aria-label="Recorte">
            {RECORTES.map((r) => (
              <button key={r.id} className="bmb-pill" aria-pressed={app.recorte === r.id} onClick={() => app.setRecorte(r.id)}>{r.rotulo}</button>
            ))}
          </div>
        )}
        <div className="usuario">
          <button className="icon-btn" onClick={() => setTema(tema === "dark" ? "light" : "dark")} aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}>
            {tema === "dark" ? <Sun /> : <Moon />}
          </button>
          <span className="usuario-nome" title={usuario.email}>{PERFIS.find((p) => p.id === usuario.perfil)!.nome}</span>
          <button className="icon-btn" onClick={sair} aria-label="Sair"><LogOut /></button>
        </div>
      </div>
    </header>
  );
}

/** Avisos padrão da face: horário da atualização e lojas do Bling sem classificação. */
export function AvisosDados() {
  const { ds, ctx, intervalo, irPara, usuario } = useApp();
  const hora = (iso: string) => iso.slice(11, 16);
  const vendas = ds.sync.find((s) => s.fonte === "shopify")!;
  const atrasadas = ds.sync.filter((s) => s.dadosAte < ds.hoje).map((s) => ({ meta: "Meta Ads", google_ads: "Google Ads", ga4: "GA4", shopify: "Shopify", bling: "Bling" })[s.fonte]);
  const falhas = ds.sync.filter((s) => !s.ok);
  const naoClass = ds.lojas.filter((l) => l.classe === "nao_classificada");
  const pedidosNC = pedidosNaoClassificados(ctx, intervalo).length;
  return (
    <div className="avisos">
      {falhas.map((f) => <AlertBanner key={f.fonte} tom="error">A sincronização de {f.fonte} falhou. Os números dessa fonte vão até {fmtDia(f.dadosAte)}.</AlertBanner>)}
      {naoClass.length > 0 && (
        <AlertBanner tom="warn" acao={usuario.perfil === "admin" ? <a href="#ajustes" onClick={(e) => { e.preventDefault(); irPara("ajustes"); }}>Classificar</a> : undefined}>
          {naoClass.length} loja nova no Bling ainda não classificada ({naoClass.map((l) => l.nome).join(", ")}). {pedidosNC} pedidos do período estão fora das áreas.
        </AlertBanner>
      )}
      <AlertBanner tom="info">Dados atualizados hoje às {hora(vendas.ultimaExecucao)}{atrasadas.length ? ` · ${atrasadas.join(", ")} até ontem` : ""}</AlertBanner>
    </div>
  );
}
