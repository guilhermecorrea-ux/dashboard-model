// Gráficos com Apache ECharts, coloridos pelos tokens do sistema visual (lidos do CSS em tempo de execução,
// então trocar o tema redesenha tudo nas cores certas).

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PictorialBarChart, PieChart, ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import mapa from "@svg-maps/brazil";
import { useApp } from "../state/app";
import { brl, pct } from "../lib/format";
import { fmtDia, fmtMes } from "../lib/dates";
import type { PontoMensal } from "../metrics";

echarts.use([BarChart, LineChart, PictorialBarChart, PieChart, ScatterChart, GridComponent, TooltipComponent, SVGRenderer]);

export const tok = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

const brlEixo = (v: number) => (v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi` : v >= 1000 ? `R$ ${Math.round(v / 1000)} mil` : `R$ ${v}`);

function useChart(build: () => echarts.EChartsCoreOption, deps: unknown[], altura: number | "fill") {
  const ref = useRef<HTMLDivElement>(null);
  const { tema } = useApp();
  useEffect(() => {
    if (!ref.current) return;
    const ch = echarts.init(ref.current, undefined, { renderer: "svg" });
    ch.setOption(build());
    const ro = new ResizeObserver(() => ch.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); ch.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema, ...deps]);
  return <div ref={ref} className={altura === "fill" ? "chart-fill" : undefined} style={{ height: altura === "fill" ? undefined : altura, width: "100%" }} />;
}

const base = () => ({
  textStyle: { fontFamily: "Manrope, system-ui, sans-serif", color: tok("ink-muted") },
  tooltip: {
    backgroundColor: tok("surface-raised"), borderColor: tok("line"), borderWidth: 1,
    textStyle: { color: tok("ink"), fontSize: 12, fontFamily: "Manrope, system-ui, sans-serif" },
    extraCssText: `border-radius:16px;box-shadow:${tok("shadow-tooltip")};padding:10px 14px;`,
  },
  animationDuration: 1000,
  animationEasing: "cubicOut" as const,
  animationDelay: (i: number) => i * 45,
  animationDurationUpdate: 600,
});

const eixoY = (fmt: (v: number) => string) => ({
  type: "value", axisLabel: { formatter: fmt, color: tok("ink-muted"), fontSize: 11, fontWeight: 600 },
  splitLine: { lineStyle: { color: tok("line"), type: "dashed" } }, splitNumber: 4,
});
const eixoX = (dados: string[]) => ({
  type: "category", data: dados, axisLine: { lineStyle: { color: tok("line") } }, axisTick: { show: false },
  axisLabel: { color: tok("ink-muted"), fontSize: 11, fontWeight: 600 },
});

/** Receita mensal: realizado (barras), planejado (traço lima) e projeção do mês em curso (hachura lilás). */
export function GraficoMensal({ serie, altura = "fill" }: { serie: PontoMensal[]; altura?: number | "fill" }) {
  return useChart(() => {
    const ult = serie.length - 1;
    return {
      ...base(),
      grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
      tooltip: {
        ...base().tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: tok("surface-raised"), opacity: 0.5 } },
        formatter: (ps: { dataIndex: number }[]) => {
          const p = serie[ps[0].dataIndex];
          const linhas = [`<b>${fmtMes(p.mes)}</b>`, `Realizado: <b>${brl(p.realizado)}</b>`];
          if (p.planejado) linhas.push(`Planejado: <b>${brl(p.planejado)}</b> · ${pct(p.realizado / p.planejado, 0)}`);
          if (p.projecao) linhas.push(`Projeção: <b>${brl(p.projecao)}</b>`);
          return linhas.join("<br/>");
        },
      },
      xAxis: eixoX(serie.map((p) => fmtMes(p.mes))),
      yAxis: eixoY(brlEixo),
      series: [
        {
          type: "bar", name: "Realizado", stack: "r", barMaxWidth: 40,
          data: serie.map((p, i) => ({ value: p.realizado, itemStyle: { color: i === ult ? { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: tok("aqua") }, { offset: 1, color: tok("brand") }] } : tok("brand-soft"), borderRadius: i === ult && p.projecao ? [0, 0, 6, 6] : [14, 14, 6, 6] } })),
          emphasis: { itemStyle: { color: tok("brand") } },
        },
        {
          type: "bar", name: "Projeção", stack: "r", barMaxWidth: 40, silent: true,
          data: serie.map((p) => (p.projecao && p.projecao > p.realizado ? p.projecao - p.realizado : "-")),
          itemStyle: {
            color: "transparent", borderColor: tok("violet"), borderWidth: 1, borderRadius: [14, 14, 0, 0],
            decal: { symbol: "rect", symbolSize: 1, color: tok("violet"), backgroundColor: "transparent", dashArrayX: [1, 0], dashArrayY: [3, 5], rotation: -Math.PI / 4 },
          },
        },
        {
          type: "pictorialBar", name: "Planejado", symbol: "rect", symbolSize: ["130%", 3], symbolPosition: "end", symbolOffset: [0, -1.5],
          barGap: "-100%", barMaxWidth: 40, z: 10, silent: true, animationDelay: (i: number) => 400 + i * 45,
          data: serie.map((p) => p.planejado || "-"), itemStyle: { color: tok("lime") },
        },
      ],
    };
  }, [serie], altura);
}

/** Composição de um total em até 5 partes (cores chart-1…chart-5). */
export function Donut({ partes, total, rotulo }: { partes: { nome: string; valor: number }[]; total: number; rotulo: string }) {
  const top = partes.slice(0, 5);
  const resto = partes.slice(5).reduce((s, x) => s + x.valor, 0);
  const lista = resto > 0 ? [...top.slice(0, 4), { nome: "Outros", valor: resto + (top[4]?.valor ?? 0) }] : top;
  const cores = (i: number, nome: string) => (nome === "Outros" ? tok("ink-muted") : tok(`chart-${i + 1}`));
  const chart = useChart(() => ({
    ...base(),
    tooltip: { ...base().tooltip, trigger: "item", formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br/><b>${brl(p.value)}</b> · ${p.percent.toFixed(1).replace(".", ",")}%` },
    series: [{
      type: "pie", radius: ["74%", "94%"], padAngle: 3, itemStyle: { borderRadius: 10 }, label: { show: false },
      data: lista.map((p, i) => ({ name: p.nome, value: p.valor, itemStyle: { color: cores(i, p.nome) } })),
    }],
  }), [JSON.stringify(lista)], 200);
  return (
    <div className="bmb-donut">
      <div className="bmb-donut-fig" style={{ width: 200, height: 200 }}>
        {chart}
        <div className="bmb-donut-center"><b>{brl(total)}</b><span>{rotulo}</span></div>
      </div>
      <ul className="bmb-legend">
        {lista.map((p, i) => (
          <li key={p.nome}>
            <i className="dot" style={{ background: cores(i, p.nome) }} />
            <span>{p.nome}</span><span className="val">{brl(p.valor)}</span>
            <span className="pct">{pct(total ? p.valor / total : 0)} do total</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fluxo de caixa previsto por semana: entradas, saídas e saldo projetado. */
export function GraficoCaixa({ semanas, altura = "fill" }: { semanas: { semana: string; entradas: number; saidas: number; saldo: number }[]; altura?: number | "fill" }) {
  return useChart(() => ({
    ...base(),
    grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      ...base().tooltip, trigger: "axis",
      formatter: (ps: { dataIndex: number }[]) => {
        const s = semanas[ps[0].dataIndex];
        return `<b>Semana de ${fmtDia(s.semana)}</b><br/>Entradas: <b>${brl(s.entradas)}</b><br/>Saídas: <b>${brl(s.saidas)}</b><br/>Saldo previsto: <b>${brl(s.saldo)}</b>`;
      },
    },
    xAxis: eixoX(semanas.map((s) => fmtDia(s.semana))),
    yAxis: eixoY(brlEixo),
    series: [
      { type: "bar", name: "Entradas", data: semanas.map((s) => s.entradas), itemStyle: { color: tok("brand"), borderRadius: [8, 8, 0, 0] }, barMaxWidth: 16 },
      { type: "bar", name: "Saídas", data: semanas.map((s) => s.saidas), itemStyle: { color: tok("violet"), borderRadius: [8, 8, 0, 0] }, barMaxWidth: 16 },
      { type: "line", name: "Saldo", data: semanas.map((s) => s.saldo), smooth: true, symbol: "circle", symbolSize: 6, lineStyle: { color: tok("lime"), width: 2.5 }, itemStyle: { color: tok("lime") },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: tok("lime") + "40" }, { offset: 1, color: tok("lime") + "00" }] } } },
    ],
  }), [semanas], altura);
}

/** Mapa do Brasil por UF, em 5 faixas de receita (quartis). Mapa: svg-maps (CC BY 4.0). */
export function MapaBrasil({ dados }: { dados: Record<string, { receita: number; pedidos: number }> }) {
  const total = Object.values(dados).reduce((s, x) => s + x.receita, 0);
  const valores = Object.values(dados).map((x) => x.receita).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p: number) => valores[Math.floor((valores.length - 1) * p)] ?? 0;
  const cortes = [q(0.25), q(0.5), q(0.75)];
  const faixa = (v: number) => (v <= 0 ? 0 : v <= cortes[0] ? 1 : v <= cortes[1] ? 2 : v <= cortes[2] ? 3 : 4);
  const ranking = Object.entries(dados).sort((a, b) => b[1].receita - a[1].receita).slice(0, 5);
  return (
    <div className="mapa">
      <svg viewBox={mapa.viewBox} className="mapa-svg" role="img" aria-label="Receita por estado">
        {mapa.locations.map((l, k) => {
          const uf = l.id.toUpperCase();
          const d = dados[uf] ?? { receita: 0, pedidos: 0 };
          return (
            <path key={l.id} d={l.path} className={`uf f${faixa(d.receita)}`} style={{ animationDelay: `${k * 28}ms` }}>
              <title>{`${l.name} (${uf})\n${brl(d.receita)} · ${pct(total ? d.receita / total : 0)} do total · ${d.pedidos} pedidos`}</title>
            </path>
          );
        })}
      </svg>
      <div className="mapa-lado">
        <div className="bmb-scale">
          <span>Receita no período</span>
          <div className="bmb-scale-bar">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ background: `var(--map-${i})` }} />)}</div>
          <span>sem venda → maior receita</span>
        </div>
        <ol className="bmb-rank">
          {ranking.map(([uf, v]) => <li key={uf} title={brl(v.receita)}><span>{uf}</span><span className="rank-barra"><i style={{ width: `${(v.receita / (ranking[0][1].receita || 1)) * 100}%` }} /></span><b>{pct(total ? v.receita / total : 0)}</b></li>)}
        </ol>
        <span className="credito">Mapa: svg-maps (CC BY 4.0)</span>
      </div>
    </div>
  );
}
