// Componentes do sistema visual BMB Dashboard (design-system/), com movimento.

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { brl, pct } from "../lib/format";
import { Num, useMontado } from "./motion";

/** Bloco da grade. span = colunas de 12 no desktop. */
export function Card({ span = 12, titulo, acao, children, className = "", destaque = false, i = 0, style }: {
  span?: number; titulo?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string; destaque?: boolean; i?: number; style?: CSSProperties;
}) {
  return (
    <section className={`card span-${span} ${destaque ? "card-destaque" : ""} ${className}`} style={{ "--i": i, ...style } as CSSProperties}>
      {(titulo || acao) && (
        <header className="card-head">
          {titulo && <h2 className="card-title">{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export const Bento = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`bento ${className}`}>{children}</div>
);

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
  const pts = serie.map((v, i) => [4 + (i * 92) / (serie.length - 1), 30 - ((v - mn) / (mx - mn || 1)) * 24]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox="0 0 100 34" aria-hidden="true">
      <path className="spark-area" d={`${d} L${lx} 34 L4 34 Z`} />
      <path className="spark-line" d={d} pathLength={1} />
      <circle className="spark-dot" cx={lx} cy={ly} r="3" />
    </svg>
  );
}

/** Cartão de KPI com número animado. */
export function Kpi({ rotulo, valor, formato, delta, rodape, serie, dica, i = 0 }: {
  rotulo: string; valor: number | null; formato: (n: number) => string; delta?: ReactNode; rodape?: ReactNode; serie?: number[]; dica?: string; i?: number;
}) {
  return (
    <article className="card kpi span-3" style={{ "--i": i } as CSSProperties} title={dica}>
      <span className="bmb-label">{rotulo}</span>
      <div className="kpi-valor">{valor === null ? <span className="num">—</span> : <Num valor={valor} formato={formato} />}</div>
      <div className="kpi-rodape">
        <div className="kpi-info">{delta}<span>{rodape}</span></div>
        {serie && <Spark serie={serie} />}
      </div>
    </article>
  );
}

/** Barra planejado × realizado. Escala vai até 125% da meta. */
export function BarraMeta({ realizado, planejado, projecao, fina = false }: {
  realizado: number; planejado: number; projecao?: number; fina?: boolean;
}) {
  const ok = useMontado(120);
  const semMeta = planejado <= 0;
  const escala = semMeta ? Math.max(realizado, projecao ?? 0) * 1.1 || 1 : Math.max(planejado * 1.25, realizado, projecao ?? 0);
  const p = (v: number) => Math.min(100, (v / escala) * 100);
  return (
    <div className={`meta-track ${fina ? "fina" : ""}`} role="img"
      aria-label={`Realizado ${brl(realizado)}${semMeta ? "" : ` de ${brl(planejado)} planejado`}`}>
      <div className="meta-fill" style={{ width: ok ? `${p(realizado)}%` : 0 }} />
      {projecao !== undefined && projecao > realizado && (
        <div className="meta-proj" style={{ left: `${p(realizado)}%`, width: ok ? `${p(projecao) - p(realizado)}%` : 0 }} />
      )}
      {!semMeta && <div className="meta-alvo" style={{ left: `${p(planejado)}%` }}><span>meta</span></div>}
    </div>
  );
}

/** Bloco de destaque: número principal grande, barra de meta e linha de contexto. */
export function Hero({ titulo, sub, realizado, planejado, projecao, esperado, delta, onCadastrarMeta, children, i = 0 }: {
  titulo: string; sub?: string; realizado: number; planejado: number; projecao?: number; esperado?: number;
  delta?: ReactNode; onCadastrarMeta?: () => void; children?: ReactNode; i?: number;
}) {
  const semMeta = planejado <= 0;
  return (
    <Card span={8} destaque i={i} className="hero">
      <div className="hero-top">
        <div>
          <span className="bmb-label">{titulo}</span>
          {sub && <p className="hero-sub">{sub}</p>}
        </div>
        {delta}
      </div>
      <div className="hero-numero"><Num valor={realizado} formato={brl} /></div>
      <div className="hero-meta">
        {semMeta ? (
          <span>Meta não cadastrada{onCadastrarMeta && <> · <button className="link-btn" onClick={onCadastrarMeta}>Cadastrar</button></>}</span>
        ) : (
          <span>de <b className="cor-meta">{brl(planejado)}</b> planejado · <b>{pct(realizado / planejado, 0)}</b> atingido</span>
        )}
      </div>
      <BarraMeta realizado={realizado} planejado={planejado} projecao={projecao} />
      <div className="hero-legenda">
        <span><i className="chave chave-real" />Realizado</span>
        {projecao !== undefined && <span><i className="chave chave-proj" />Projeção <b>{brl(projecao)}</b></span>}
        {!semMeta && esperado !== undefined && (
          <span className={realizado >= esperado ? "ritmo-ok" : "ritmo-baixo"}>
            <i className={`chave ${realizado >= esperado ? "chave-ok" : "chave-baixo"}`} />
            Ritmo {pct(esperado ? realizado / esperado : 0, 0)} do esperado até hoje
          </span>
        )}
      </div>
      {children}
    </Card>
  );
}

/** Medidor em cápsulas, o desenho do símbolo da BMB: cada cápsula enche até o % da meta. */
export function Capsulas({ itens, centro, rotuloCentro }: {
  itens: { nome: string; valor: number; cor: string }[]; centro: string; rotuloCentro: string;
}) {
  const ok = useMontado(250);
  const H = [228, 176, 176];
  const ordem = [1, 0, 2];
  return (
    <div className="capsulas">
      <div className="capsulas-topo"><b className="num">{centro}</b><span>{rotuloCentro}</span></div>
      <div className="capsulas-tubos">
        {ordem.filter((k) => itens[k]).map((k) => { const it = itens[k]; return (
          <div key={it.nome} className="tubo" style={{ "--h": H[k] } as CSSProperties}>
            <div className="tubo-vidro">
              <div className={`tubo-liquido ${k === 0 ? "liquido-marca" : ""}`}
                style={{ height: ok ? `${Math.min(100, Math.max(it.valor, 0.04) * 100)}%` : "0%", background: k === 0 ? undefined : it.cor, transitionDelay: `${k * 160}ms` }}>
                <span className="tubo-onda" />
              </div>
              <span className="tubo-pct num">{pct(it.valor, 0)}</span>
            </div>
            <span className="tubo-nome">{it.nome}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

/** Abas com indicador deslizante. */
export function Abas<T extends string>({ abas, ativa, onChange, pequeno = false }: {
  abas: { id: T; rotulo: string }[]; ativa: T; onChange: (t: T) => void; pequeno?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-id="${ativa}"]`);
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [ativa, abas.length]);
  return (
    <div className={`abas ${pequeno ? "abas-p" : ""}`} role="tablist" ref={ref}>
      <span className="abas-ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
      {abas.map((a) => (
        <button key={a.id} data-id={a.id} role="tab" aria-selected={a.id === ativa} onClick={() => onChange(a.id)}>{a.rotulo}</button>
      ))}
    </div>
  );
}

export interface Coluna<T> { titulo: string; valor: (row: T) => ReactNode; direita?: boolean }

export function DataTable<T>({ colunas, linhas, limite = 8, vazio = "Nada para mostrar no período." }: {
  colunas: Coluna<T>[]; linhas: T[]; limite?: number; vazio?: string;
}) {
  const [todos, setTodos] = useState(false);
  const vis = todos ? linhas : linhas.slice(0, limite);
  if (!linhas.length) return <p className="vazio">{vazio}</p>;
  return (
    <div className="tabela">
      <div className="bmb-table-wrap">
        <table className="bmb-table tabela-lista">
          <thead><tr>{colunas.map((c) => <th key={c.titulo} className={c.direita ? "r" : ""}>{c.titulo}</th>)}</tr></thead>
          <tbody>
            {vis.map((l, i) => (
              <tr key={i} style={{ "--i": i } as CSSProperties}>{colunas.map((c) => <td key={c.titulo} data-label={c.titulo} className={c.direita ? "r" : ""}>{c.valor(l)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {linhas.length > limite && (
        <button className="link-btn mais" onClick={() => setTodos(!todos)}>{todos ? "Mostrar menos" : `Ver todos (${linhas.length}) ›`}</button>
      )}
    </div>
  );
}

/** Barras horizontais para rankings curtos. Crescem ao aparecer. */
export function BarList({ itens, formato = brl, cor = "brand" }: {
  itens: { nome: string; valor: number; extra?: string }[]; formato?: (n: number) => string; cor?: "brand" | "violet" | "lime" | "marca";
}) {
  const ok = useMontado(150);
  const mx = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="barlist">
      {itens.map((i, k) => (
        <li key={i.nome}>
          <div className="barlist-top"><span>{i.nome}</span><b>{formato(i.valor)}{i.extra ? <em> · {i.extra}</em> : null}</b></div>
          <div className="barlist-track">
            <div className={`barlist-fill cor-${cor}`} style={{ width: ok ? `${(i.valor / mx) * 100}%` : 0, transitionDelay: `${k * 70}ms` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Número grande com rótulo, para blocos laterais. */
export function Stat({ rotulo, valor, formato, nota, tom }: {
  rotulo: string; valor: number | null; formato: (n: number) => string; nota?: ReactNode; tom?: "pos" | "neg";
}) {
  return (
    <div className={`stat ${tom ? `stat-${tom}` : ""}`}>
      <span className="bmb-label">{rotulo}</span>
      <b>{valor === null ? "—" : <Num valor={valor} formato={formato} />}</b>
      {nota && <span className="stat-nota">{nota}</span>}
    </div>
  );
}

/** Barra segmentada (composição) com legenda. */
export function Segmentos({ partes }: { partes: { nome: string; valor: number; cor: string; nota?: string }[] }) {
  const ok = useMontado(150);
  const tot = partes.reduce((s, p) => s + p.valor, 0) || 1;
  return (
    <div className="segmentos">
      <div className="seg-barra">
        {partes.map((p, k) => (
          <span key={p.nome} style={{ width: ok ? `${(p.valor / tot) * 100}%` : 0, background: p.cor, transitionDelay: `${k * 90}ms` }} title={`${p.nome}: ${p.valor}`} />
        ))}
      </div>
      <ul className="seg-legenda">
        {partes.map((p) => (
          <li key={p.nome}><i style={{ background: p.cor }} /><span>{p.nome}</span><b>{p.nota ?? p.valor}</b></li>
        ))}
      </ul>
    </div>
  );
}

/** Painel simples de largura total (telas de configuração). */
export function Panel({ titulo, acao, children }: { titulo?: string; acao?: ReactNode; children: ReactNode }) {
  return <Card span={12} titulo={titulo} acao={acao}>{children}</Card>;
}

export function AlertBanner({ tom, children }: { tom: "info" | "warn" | "error"; children: ReactNode }) {
  return <div className={`bmb-alert bmb-alert-${tom}`} role={tom === "error" ? "alert" : "status"}>{children}</div>;
}

/** Estado vazio: explica o que falta e de onde virá, em vez de mostrar zeros. */
export function SemDados({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Card span={12} className="sem-dados">
      <div className="sem-dados-icone" aria-hidden="true"><span /><span /><span /></div>
      <h2 className="card-title">{titulo}</h2>
      <p className="nota">{texto}</p>
    </Card>
  );
}
