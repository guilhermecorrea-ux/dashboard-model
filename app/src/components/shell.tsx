import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Boxes, Building2, LayoutGrid, LogOut, Moon, ShoppingBag, SlidersHorizontal, Sun, Target, Wallet } from "lucide-react";
import { LogoBMB } from "./Logo";
import { PERFIS, useApp, type FaceId } from "../state/app";
import { COMPARACOES, PERIODOS } from "../metrics/periodo";
import { pedidosNaoClassificados } from "../metrics";
import { fmtDia, MESES_LONGOS, fromISO } from "../lib/dates";
import { MODO_DADOS } from "../data/provider";
import { Abas } from "./ui";

export const FACES: { id: FaceId; nome: string; curto: string; icone: ReactNode }[] = [
  { id: "overview", nome: "Overview", curto: "Overview", icone: <LayoutGrid /> },
  { id: "dtc", nome: "Performance DTC", curto: "DTC", icone: <ShoppingBag /> },
  { id: "b2b", nome: "Performance B2B", curto: "B2B", icone: <Building2 /> },
  { id: "supply", nome: "Supply Chain", curto: "Supply", icone: <Boxes /> },
  { id: "finance", nome: "Finance", curto: "Finance", icone: <Wallet /> },
  { id: "metas", nome: "Metas", curto: "Metas", icone: <Target /> },
  { id: "ajustes", nome: "Ajustes", curto: "Ajustes", icone: <SlidersHorizontal /> },
];

/** Menu lateral com marcador que desliza até a face ativa. */
export function SidebarNav() {
  const { face, irPara, usuario } = useApp();
  const permitidas = PERFIS.find((p) => p.id === usuario.perfil)!.faces;
  const ref = useRef<HTMLElement>(null);
  const [y, setY] = useState<number | null>(null);
  // Mede pela posição dentro do menu (offsetTop), que não depende da rolagem nem do momento em que a
  // página fica visível; remede quando o menu muda de tamanho (fontes, logo, troca de layout).
  useLayoutEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    const medir = () => {
      const a = rail.querySelector<HTMLElement>(`a[data-id="${face}"]`);
      const ico = a?.querySelector<HTMLElement>(".ico");
      if (!a || !ico || a.offsetParent !== rail || ico.offsetHeight === 0) { setY(null); return; }
      setY(a.offsetTop + ico.offsetTop);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(rail);
    document.fonts?.ready.then(medir);
    return () => ro.disconnect();
  }, [face]);
  const item = (f: (typeof FACES)[number]) =>
    permitidas.includes(f.id) && (
      <a key={f.id} data-id={f.id} href={`#${f.id}`} aria-current={face === f.id ? "page" : undefined}
        onClick={(e) => { e.preventDefault(); irPara(f.id); }}>
        <span className="ico">{f.icone}</span>{f.curto}
      </a>
    );
  return (
    <nav className={`rail ${y !== null ? "rail-medido" : ""}`} aria-label="Faces do dashboard" ref={ref}>
      <LogoBMB />
      {y !== null && <span className="rail-ind" style={{ transform: `translateY(${y}px)` }} />}
      {FACES.slice(0, 5).map(item)}
      {(permitidas.includes("metas") || permitidas.includes("ajustes")) && <div className="rail-sep" />}
      {FACES.slice(5).map(item)}
    </nav>
  );
}

function useAvisos() {
  const { ds, ctx, intervalo } = useApp();
  const falhas = ds.sync.filter((s) => !s.ok);
  const naoClass = ds.lojas.filter((l) => l.classe === "nao_classificada");
  const pedidosNC = pedidosNaoClassificados(ctx, intervalo).length;
  const atrasadas = ds.sync.filter((s) => s.dadosAte < ds.hoje)
    .map((s) => ({ meta: "Meta Ads", google_ads: "Google Ads", ga4: "GA4", shopify: "Shopify", bling: "Bling" })[s.fonte]);
  const lista: { tom: "warn" | "error" | "info"; texto: string; acao?: FaceId }[] = [
    ...falhas.map((f) => ({ tom: "error" as const, texto: `A sincronização de ${f.fonte} falhou. Os números dessa fonte vão até ${fmtDia(f.dadosAte)}.` })),
    ...naoClass.map((l) => ({ tom: "warn" as const, texto: `Loja nova no Bling sem classificação: ${l.nome}. ${pedidosNC} pedidos do período estão fora das áreas.`, acao: "ajustes" as FaceId })),
    ...(atrasadas.length ? [{ tom: "info" as const, texto: `${atrasadas.join(", ")} atualizam 1 vez por dia: dados até ontem.` }] : []),
  ];
  return lista;
}

function Popover({ aberto, onFechar, children, className = "" }: { aberto: boolean; onFechar: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onFechar(); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return <div ref={ref} className={`popover ${className}`}>{children}</div>;
}

export function FaceHeader({ titulo, filtros = true }: { titulo: string; filtros?: boolean }) {
  const app = useApp();
  const { ds, tema, setTema, usuario, sair, irPara } = app;
  const avisos = useAvisos();
  const [sino, setSino] = useState(false);
  const [menu, setMenu] = useState(false);
  const venda = ds.sync.find((s) => s.fonte === "shopify") ?? ds.sync.find((s) => s.fonte === "bling");
  const pendentes = avisos.filter((a) => a.tom !== "info").length;
  const perfil = PERFIS.find((p) => p.id === usuario.perfil)!;
  const mes = MESES_LONGOS[fromISO(ds.hoje).getMonth()];
  return (
    <header className="topo">
      <div className="topo-titulo">
        <span className="topo-empresa">
          <span className="ao-vivo" aria-hidden="true" />
          {ds.empresa} · {venda ? `atualizado às ${venda.ultimaExecucao.slice(11, 16)}` : "aguardando a primeira sincronização"}
          {MODO_DADOS === "simulado" && <span className="selo-sim">dados simulados</span>}
        </span>
        <h1 className="page-title">{titulo}</h1>
        <span className="topo-data">{fromISO(ds.hoje).getDate()} de {mes} de {fromISO(ds.hoje).getFullYear()}</span>
      </div>
      <div className="topo-acoes">
        {filtros && (
          <>
            <div className="topo-periodo"><Abas abas={PERIODOS} ativa={app.periodo} onChange={app.setPeriodo} /></div>
            <label className="comparar">
              <span className="sr-only">Comparação</span>
              <select value={app.comparacao} onChange={(e) => app.setComparacao(e.target.value as typeof app.comparacao)}>
                {COMPARACOES.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
              </select>
            </label>
          </>
        )}
        <div className="topo-conta">
        <div className="ancora">
          <button className="icone-btn" aria-label={`Avisos (${pendentes})`} onClick={() => setSino(!sino)}>
            <Bell />{pendentes > 0 && <span className="badge">{pendentes}</span>}
          </button>
          <Popover aberto={sino} onFechar={() => setSino(false)} className="pop-avisos">
            <span className="bmb-label">Avisos</span>
            {avisos.length === 0 && <p className="vazio">Tudo em dia.</p>}
            {avisos.map((a, k) => (
              <div key={k} className={`aviso aviso-${a.tom}`}>
                <p>{a.texto}</p>
                {a.acao && usuario.perfil === "admin" && <button className="link-btn" onClick={() => { setSino(false); irPara(a.acao!); }}>Classificar ›</button>}
              </div>
            ))}
          </Popover>
        </div>
        <div className="ancora">
          <button className="avatar" onClick={() => setMenu(!menu)} aria-label="Conta">{usuario.email.slice(0, 1).toUpperCase()}</button>
          <Popover aberto={menu} onFechar={() => setMenu(false)} className="pop-menu">
            <div className="pop-conta"><b>{usuario.email}</b><span>{perfil.nome}</span></div>
            {FACES.slice(5).filter((f) => perfil.faces.includes(f.id)).map((f) => (
              <button key={f.id} className="pop-item so-mobile" onClick={() => { setMenu(false); irPara(f.id); }}>{f.icone} {f.nome}</button>
            ))}
            <button className="pop-item" onClick={() => setTema(tema === "dark" ? "light" : "dark")}>
              {tema === "dark" ? <Sun /> : <Moon />} {tema === "dark" ? "Tema claro" : "Tema escuro"}
            </button>
            <button className="pop-item" onClick={sair}><LogOut /> Sair</button>
          </Popover>
        </div>
        </div>
      </div>
    </header>
  );
}

/** Só mostra faixa quando uma sincronização falhou; o resto fica no sino. */
export function AvisoCritico() {
  const avisos = useAvisos().filter((a) => a.tom === "error");
  if (!avisos.length) return null;
  return <div className="bmb-alert bmb-alert-error" role="alert">{avisos[0].texto}</div>;
}
