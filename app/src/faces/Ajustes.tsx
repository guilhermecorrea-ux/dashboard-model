import { useState } from "react";
import { useApp } from "../state/app";
import { FaceHeader } from "../components/shell";
import { AlertBanner, Panel } from "../components/ui";
import type { ClasseLoja, LojaCanal } from "../data/types";

const CLASSES: { id: ClasseLoja; nome: string }[] = [
  { id: "site", nome: "DTC · site (Shopify)" },
  { id: "marketplace", nome: "DTC · marketplace" },
  { id: "b2b", nome: "B2B" },
  { id: "nao_classificada", nome: "Não classificada" },
];

const FONTES: Record<string, string> = { shopify: "Shopify", bling: "Bling", meta: "Meta Ads (Windsor)", google_ads: "Google Ads (script)", ga4: "GA4" };

/** Configuração da empresa: classificação das lojas do Bling e estado das fontes. */
export function Ajustes() {
  const { ds, salvarLojas } = useApp();
  const [lojas, setLojas] = useState<LojaCanal[]>(ds.lojas);
  const [salvo, setSalvo] = useState(false);
  const alterado = JSON.stringify(lojas) !== JSON.stringify(ds.lojas);
  const mudar = (id: string, classe: ClasseLoja) =>
    setLojas(lojas.map((l) => (l.id === id ? { ...l, classe, espelhaSite: classe === "site" } : l)));

  return (
    <>
      <FaceHeader titulo="Ajustes" filtros={false} />
      {salvo && <AlertBanner tom="info">Classificação salva. Os números já consideram as novas áreas.</AlertBanner>}
      <Panel titulo="Lojas do Bling" acao={
        <button className="bmb-pill" aria-pressed="true" disabled={!alterado}
          onClick={async () => { await salvarLojas(lojas); setSalvo(true); setTimeout(() => setSalvo(false), 2500); }}>Salvar</button>
      }>
        <p className="nota">Cada loja configurada no Bling entra numa área. A loja que espelha o site fica fora da receita do Bling, porque a receita do site vem da Shopify.</p>
        <div className="bmb-table-wrap">
          <table className="bmb-table">
            <thead><tr><th>Loja no Bling</th><th>Classificação</th><th>Receita do site</th></tr></thead>
            <tbody>
              {lojas.map((l) => (
                <tr key={l.id}>
                  <td>{l.nome}</td>
                  <td>
                    <select id={`loja-${l.id}`} className={`select ${l.classe === "nao_classificada" ? "select-warn" : ""}`} value={l.classe}
                      onChange={(e) => mudar(l.id, e.target.value as ClasseLoja)} aria-label={`Classificação de ${l.nome}`}>
                      {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </td>
                  <td className="bmb-muted">{l.classe === "site" ? "vem da Shopify (loja excluída)" : "vem do Bling"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel titulo="Fontes de dados">
        <div className="bmb-table-wrap">
          <table className="bmb-table">
            <thead><tr><th>Fonte</th><th>Última sincronização</th><th>Dados até</th><th>Situação</th></tr></thead>
            <tbody>
              {ds.sync.map((s) => (
                <tr key={s.fonte}>
                  <td>{FONTES[s.fonte]}</td>
                  <td>{s.ultimaExecucao.slice(8, 10)}/{s.ultimaExecucao.slice(5, 7)} às {s.ultimaExecucao.slice(11, 16)}</td>
                  <td>{s.dadosAte.slice(8, 10)}/{s.dadosAte.slice(5, 7)}</td>
                  <td><span className={`bmb-delta ${s.ok ? "bmb-delta-pos" : "bmb-delta-neg"}`}>{s.ok ? "● Funcionando" : "● Falhou"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">Alertas de falha vão para tools@bigmondobrands.com.</p>
      </Panel>
    </>
  );
}
