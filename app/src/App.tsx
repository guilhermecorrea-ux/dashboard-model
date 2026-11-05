import { useEffect, useState } from "react";
import { LogoBMB } from "./components/Logo";
import { AppProvider, PERFIS, useApp, type Perfil } from "./state/app";
import { SidebarNav } from "./components/shell";
import { Overview } from "./faces/Overview";
import { DTC } from "./faces/DTC";
import { B2B } from "./faces/B2B";
import { Supply } from "./faces/Supply";
import { Finance } from "./faces/Finance";
import { Metas } from "./faces/Metas";
import { Ajustes } from "./faces/Ajustes";
import { MODO_DADOS } from "./data/provider";
import { enviarLink, sair as sairSupabase, sessaoAtual } from "./data/supabase";

const KEY = "bmb.sessao.v1";
type Sessao = { email: string; perfil: Perfil };
const real = MODO_DADOS === "supabase";

function lerSessaoDemo(): Sessao | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

function Login({ entrar, aviso }: { entrar: (s: Sessao) => void; aviso?: string }) {
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("admin");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado">("");
  const [erro, setErro] = useState(aviso ?? "");
  const enviar = async () => {
    if (!email.includes("@")) return;
    if (!real) return entrar({ email, perfil });
    setEstado("enviando"); setErro("");
    try { await enviarLink(email.trim().toLowerCase()); setEstado("enviado"); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); setEstado(""); }
  };
  return (
    <div className="tela-centro">
      <form className="bmb-panel login" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <LogoBMB />
        <h1 className="page-title">Entrar</h1>
        {estado === "enviado" ? (
          <p>Enviamos um link de acesso para <b>{email}</b>. Abra o e-mail neste aparelho e toque no link.</p>
        ) : (
          <>
            <p className="bmb-muted">Digite seu e-mail. Você recebe um link de acesso, sem senha.</p>
            <label className="campo">
              <span className="bmb-label">E-mail</span>
              <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" />
            </label>
            {!real && (
              <label className="campo">
                <span className="bmb-label">Perfil (demonstração)</span>
                <select id="login-perfil" className="select" value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
                  {PERFIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </label>
            )}
            {erro && <div className="bmb-alert bmb-alert-error" role="alert">{erro}</div>}
            <button className="bmb-pill" aria-pressed="true" type="submit" disabled={estado === "enviando"}>
              {real ? (estado === "enviando" ? "Enviando…" : "Enviar link de acesso") : "Entrar na demonstração"}
            </button>
            {!real && <p className="nota">Modo demonstração com dados simulados da Vitanuts: o acesso é imediato e o perfil escolhido define as faces visíveis.</p>}
          </>
        )}
      </form>
    </div>
  );
}

function Faces() {
  const { face } = useApp();
  const Tela = { overview: Overview, dtc: DTC, b2b: B2B, supply: Supply, finance: Finance, metas: Metas, ajustes: Ajustes }[face];
  return (
    <div className="app">
      <SidebarNav />
      <main className="conteudo"><Tela /></main>
    </div>
  );
}

export default function App() {
  const [sessao, setSessao] = useState<Sessao | null>(real ? null : lerSessaoDemo);
  const [carregando, setCarregando] = useState(real);
  const [aviso, setAviso] = useState<string | undefined>();

  // Modo real: a sessão vem do link mágico do Supabase; o perfil vem da tabela usuarios_perfis.
  useEffect(() => {
    if (!real) return;
    sessaoAtual()
      .then((s) => {
        if (s) setSessao({ email: s.email, perfil: s.perfil as Perfil });
        else if (window.location.hash.includes("access_token")) setAviso("Seu e-mail entrou, mas ainda não tem perfil neste dashboard. Peça ao administrador para liberar.");
      })
      .catch((e) => setAviso(String(e.message ?? e)))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <div className="tela-centro bmb-muted">Carregando…</div>;
  if (!sessao)
    return <Login aviso={aviso} entrar={(s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ok */ } setSessao(s); }} />;
  const sair = async () => {
    if (real) await sairSupabase();
    try { localStorage.removeItem(KEY); } catch { /* ok */ }
    setSessao(null);
  };
  return (
    <AppProvider usuario={sessao} sair={sair}>
      <Faces />
    </AppProvider>
  );
}
