import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProvider } from "../data/provider";
import type { Dataset, LojaCanal, Meta } from "../data/types";
import { criarCtx, facesDisponiveis, fontesAtivas, type Ctx, type Recorte } from "../metrics";
import { intervalo, intervaloComparacao, type Comparacao, type Intervalo, type PeriodoTipo } from "../metrics/periodo";

export type FaceId = "overview" | "dtc" | "b2b" | "supply" | "finance" | "metas" | "ajustes";
export type Perfil = "admin" | "gestor" | "marketing" | "financeiro" | "leitura";

export const PERFIS: { id: Perfil; nome: string; faces: FaceId[] }[] = [
  { id: "admin", nome: "Admin holding", faces: ["overview", "dtc", "b2b", "supply", "finance", "metas", "ajustes"] },
  { id: "gestor", nome: "Gestor da empresa", faces: ["overview", "dtc", "b2b", "supply", "finance", "metas"] },
  { id: "marketing", nome: "Marketing", faces: ["overview", "dtc"] },
  { id: "financeiro", nome: "Financeiro", faces: ["overview", "b2b", "supply", "finance"] },
  { id: "leitura", nome: "Leitura", faces: ["overview"] },
];

interface Usuario { email: string; perfil: Perfil }

interface AppState {
  ds: Dataset;
  ctx: Ctx;
  usuario: Usuario;
  sair: () => void;
  face: FaceId;
  irPara: (f: FaceId) => void;
  periodo: PeriodoTipo;
  setPeriodo: (p: PeriodoTipo) => void;
  comparacao: Comparacao;
  setComparacao: (c: Comparacao) => void;
  recorte: Recorte;
  setRecorte: (r: Recorte) => void;
  intervalo: Intervalo;
  comp: Intervalo | null;
  permitidas: FaceId[];
  fontes: ReturnType<typeof fontesAtivas>;
  periodoCustom: Intervalo | null;
  setPeriodoCustom: (i: Intervalo) => void;
  tema: "dark" | "light";
  setTema: (t: "dark" | "light") => void;
  salvarMetas: (m: Meta[]) => Promise<void>;
  salvarLojas: (l: LojaCanal[]) => Promise<void>;
}

const Ctx_ = createContext<AppState | null>(null);

export const useApp = () => {
  const v = useContext(Ctx_);
  if (!v) throw new Error("useApp fora do AppProvider");
  return v;
};

const lerHash = (): FaceId => {
  const h = window.location.hash.replace("#", "") as FaceId;
  return ["overview", "dtc", "b2b", "supply", "finance", "metas", "ajustes"].includes(h) ? h : "overview";
};

export function AppProvider({ usuario, sair, children }: { usuario: Usuario; sair: () => void; children: ReactNode }) {
  const provider = useMemo(() => getProvider(), []);
  const [ds, setDs] = useState<Dataset | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [face, setFace] = useState<FaceId>(lerHash);
  const [periodo, setPeriodo] = useState<PeriodoTipo>("mes");
  const [comparacao, setComparacao] = useState<Comparacao>("anterior");
  const [recorte, setRecorte] = useState<Recorte>("tudo");
  const [periodoCustom, setPeriodoCustom] = useState<Intervalo | null>(null);
  const [tema, setTemaState] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("bmb.tema") as "dark" | "light") || "dark"; } catch { return "dark"; }
  });

  useEffect(() => { provider.load().then(setDs).catch((e) => setErro(String(e.message ?? e))); }, [provider]);
  useEffect(() => {
    const on = () => setFace(lerHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try { localStorage.setItem("bmb.tema", tema); } catch { /* sem armazenamento */ }
  }, [tema]);


  const irPara = useCallback((f: FaceId) => { window.location.hash = f; setFace(f); window.scrollTo(0, 0); }, []);

  const ctx = useMemo(() => (ds ? criarCtx(ds) : null), [ds]);
  // Faces do perfil que também têm dados nesta empresa (ex.: sem Shopify nem marketplaces, sem DTC).
  const permitidas = useMemo(() => {
    const doPerfil = PERFIS.find((p) => p.id === usuario.perfil)!.faces;
    if (!ctx) return doPerfil;
    const disp = facesDisponiveis(ctx);
    return doPerfil.filter((f) => disp.includes(f));
  }, [ctx, usuario.perfil]);
  const faceAtual = permitidas.includes(face) ? face : "overview";
  const iv = useMemo(() => (ds ? intervalo(periodo, ds.hoje, periodoCustom ?? undefined) : null), [ds, periodo, periodoCustom]);
  const comp = useMemo(() => (ds && iv ? intervaloComparacao(iv, periodo, comparacao, ds.inicioHistorico) : null), [ds, iv, periodo, comparacao]);

  if (erro) return <div className="tela-centro"><div className="bmb-alert bmb-alert-error">{erro}</div></div>;
  if (!ds || !ctx || !iv) return <div className="tela-centro bmb-muted">Carregando dados…</div>;

  const value: AppState = {
    ds, ctx, usuario, sair, face: faceAtual, irPara, permitidas, fontes: fontesAtivas(ctx),
    periodo, setPeriodo, comparacao, setComparacao, recorte, setRecorte,
    intervalo: iv, comp, tema, setTema: setTemaState,
    periodoCustom, setPeriodoCustom: (i) => { setPeriodoCustom(i); setPeriodo("custom"); },
    salvarMetas: async (metas) => { await provider.saveMetas(metas); setDs({ ...ds, metas }); },
    salvarLojas: async (lojas) => { await provider.saveLojas(lojas); setDs({ ...ds, lojas }); },
  };
  return <Ctx_.Provider value={value}>{children}</Ctx_.Provider>;
}
