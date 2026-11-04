// Componentes do sistema visual BMB Dashboard (design-system/). As classes bmb-* vêm de components/bundle.css.

import { useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { brl, pct } from "../lib/format";

export function Panel({ titulo, acao, children, className = "", style }: {
  titulo?: string; acao?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <section className={`bmb-panel ${className}`} style={style}>
      {(titulo || acao) && (
        <div className="bmb-panel-head">
          {titulo && <h2 className="bmb-panel-title">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

/** Variação: a cor diz se é bom ou ruim para o negócio; a seta diz se subiu ou desceu. */
export function DeltaChip({ valor, texto, inverso = false, sufixo }: {
  valor: number | null; texto?: string; inverso?: boolean; sufixo?: string;
}) {
  if (valor === null || !Number.isFinite(valor)) return <span className="bmb-delta bmb-delta-flat">sem comparação</span>;
  const subiu = valor > 0.0005, desceu = valor < -0.0005;
  const bom = inverso ? desceu : subiu;
  const tom = !subiu && !desceu ? "flat" : bom ? "pos" : "neg";
  const seta = subiu ? "▲" : desceu ? "▼" : "■";
  return <span className={`bmb-delta bmb-delta-${tom}`}>{seta} {texto}{sufixo ? ` ${sufixo}` : ""}</span>;
}

export function Spark({ serie }: { serie: number[] }) {
  if (serie.length < 2) return null;
  const mx = Math.max(...serie), mn = Math.min(...serie);
  const pts = serie.map((v, i) => [4 + (i * 80) / (serie.length - 1), 24 - ((v - mn) / (mx - mn || 1)) * 20]);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="bmb-spark" viewBox="0 0 88 28" aria-hidden="true">
      <polyline points={pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ")} />
      <circle cx={lx} cy={ly} r="3" />
    </svg>
  );
}

export function KpiCard({ rotulo, valor, delta, rodape, serie, dica }: {
  rotulo: string; valor: string; delta?: ReactNode; rodape?: ReactNode; serie?: number[]; dica?: string;
}) {
  return (
    <article className="bmb-kpi" title={dica}>
      <div className="bmb-kpi-top"><span className="bmb-label">{rotulo}</span>{delta}</div>
      <p className="bmb-kpi-value">{valor}</p>
      <div className="bmb-kpi-foot"><span>{rodape}</span>{serie && <Spark serie={serie} />}</div>
    </article>
  );
}

/** Planejado × realizado com projeção do mês. Escala vai até 125% da meta. */
export function PlanVsActual({ titulo, realizado, planejado, projecao, esperado, delta, compacto = false, onCadastrarMeta }: {
  titulo: string; realizado: number; planejado: number; projecao?: number; esperado?: number; delta?: ReactNode; compacto?: boolean; onCadastrarMeta?: () => void;
}) {
  const semMeta = planejado <= 0;
  const escala = semMeta ? Math.max(realizado, projecao ?? 0) * 1.1 : Math.max(planejado * 1.25, realizado, projecao ?? 0);
  const w = (v: number) => `${Math.min(100, (v / escala) * 100)}%`;
  const atingido = semMeta ? null : realizado / planejado;
  return (
    <Panel titulo={titulo} acao={delta}>
      <div className="bmb-pva">
        <div className="bmb-pva-values">
          <span className={compacto ? "bmb-pva-main pva-compacto" : "bmb-pva-main"}>{brl(realizado)}</span>
          {semMeta ? (
            <span className="bmb-pva-of">Meta não cadastrada · {onCadastrarMeta && <button className="link-btn" onClick={onCadastrarMeta}>Cadastrar</button>}</span>
          ) : (
            <span className="bmb-pva-of">de <b>{brl(planejado)}</b> planejado · {pct(atingido ?? 0, 0)} atingido</span>
          )}
        </div>
        <div className="bmb-track" role="img" aria-label={`Realizado ${brl(realizado)}${semMeta ? "" : `, ${pct(atingido ?? 0, 0)} da meta`}`}>
          <div className="bmb-fill" style={{ width: w(realizado) }} />
          {projecao !== undefined && projecao > realizado && (
            <div className="bmb-proj" style={{ left: w(realizado), width: `calc(${w(projecao)} - ${w(realizado)})` }} />
          )}
          {!semMeta && <div className="bmb-target" style={{ left: w(planejado) }} />}
        </div>
        <div className="bmb-pva-legend">
          <span><i className="bmb-key bmb-key-real" />Realizado <strong>{brl(realizado)}</strong></span>
          {projecao !== undefined && (
            <span><i className="bmb-key bmb-key-proj" />Projeção do mês <strong>{brl(projecao)}{semMeta ? "" : ` · ${pct(projecao / planejado, 0)}`}</strong></span>
          )}
          {!semMeta && <span><i className="bmb-key bmb-key-meta" />Planejado <strong>{brl(planejado)}</strong></span>}
          {!semMeta && esperado !== undefined && (
            <span>Esperado até hoje <strong>{brl(esperado)} · {realizado >= esperado ? "acima" : "abaixo"} ({pct(esperado ? realizado / esperado : 0, 0)})</strong></span>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function AlertBanner({ tom, children, acao }: { tom: "info" | "warn" | "error"; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className={`bmb-alert bmb-alert-${tom}`} role={tom === "error" ? "alert" : "status"}>
      {tom === "info" ? <Info aria-hidden /> : <AlertTriangle aria-hidden />}
      <span>{children}</span>
      {acao}
    </div>
  );
}

export interface Coluna<T> {
  titulo: string;
  valor: (row: T) => ReactNode;
  direita?: boolean;
}

export function DataTable<T>({ colunas, linhas, limite = 10, vazio = "Nada para mostrar no período." }: {
  colunas: Coluna<T>[]; linhas: T[]; limite?: number; vazio?: string;
}) {
  const [todos, setTodos] = useState(false);
  const vis = todos ? linhas : linhas.slice(0, limite);
  if (!linhas.length) return <p className="bmb-muted vazio">{vazio}</p>;
  return (
    <>
      <div className="bmb-table-wrap">
        <table className="bmb-table">
          <thead><tr>{colunas.map((c) => <th key={c.titulo} className={c.direita ? "r" : ""}>{c.titulo}</th>)}</tr></thead>
          <tbody>
            {vis.map((l, i) => <tr key={i}>{colunas.map((c) => <td key={c.titulo} className={c.direita ? "r" : ""}>{c.valor(l)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {linhas.length > limite && (
        <button className="bmb-panel-action link-btn" onClick={() => setTodos(!todos)}>
          {todos ? "Mostrar menos" : `Ver todos (${linhas.length}) ›`}
        </button>
      )}
    </>
  );
}

/** Barras horizontais para rankings curtos (origem de tráfego, vendedores, canais). */
export function BarList({ itens, formato = brl, cor = "brand" }: {
  itens: { nome: string; valor: number; extra?: string }[]; formato?: (n: number) => string; cor?: "brand" | "violet" | "lime";
}) {
  const mx = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="barlist">
      {itens.map((i) => (
        <li key={i.nome}>
          <div className="barlist-top"><span>{i.nome}</span><b>{formato(i.valor)}{i.extra ? <em> · {i.extra}</em> : null}</b></div>
          <div className="barlist-track"><div className={`barlist-fill cor-${cor}`} style={{ width: `${(i.valor / mx) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Grid({ cols, children, className = "" }: { cols: string; children: ReactNode; className?: string }) {
  return <div className={`grid ${className}`} style={{ "--cols": cols } as React.CSSProperties}>{children}</div>;
}
