import { useState } from "react";
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

const KEY = "bmb.sessao.v1";
type Sessao = { email: string; perfil: Perfil };

function lerSessao(): Sessao | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

function Login({ entrar }: { entrar: (s: Sessao) => void }) {
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("admin");
  return (
    <div className="tela-centro">
      <form className="bmb-panel login" onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) entrar({ email, perfil }); }}>
        <div className="bmb-rail-logo">BMB</div>
        <h1 className="page-title">Entrar</h1>
        <p className="bmb-muted">Digite seu e-mail. Você recebe um link de acesso, sem senha.</p>
        <label className="campo">
          <span className="bmb-label">E-mail</span>
          <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" />
        </label>
        {MODO_DADOS === "simulado" && (
          <label className="campo">
            <span className="bmb-label">Perfil (demonstração)</span>
            <select id="login-perfil" className="select" value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
              {PERFIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        )}
        <button className="bmb-pill" aria-pressed="true" type="submit">{MODO_DADOS === "simulado" ? "Entrar na demonstração" : "Enviar link de acesso"}</button>
        {MODO_DADOS === "simulado" && <p className="nota">Modo demonstração com dados simulados da Vitanuts: o acesso é imediato e o perfil escolhido define as faces visíveis.</p>}
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
  const [sessao, setSessao] = useState<Sessao | null>(lerSessao);
  if (!sessao)
    return <Login entrar={(s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ok */ } setSessao(s); }} />;
  return (
    <AppProvider usuario={sessao} sair={() => { try { localStorage.removeItem(KEY); } catch { /* ok */ } setSessao(null); }}>
      <Faces />
    </AppProvider>
  );
}
