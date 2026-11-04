import { useMemo } from "react";
import { useApp } from "../state/app";
import { AvisosDados, FaceHeader } from "../components/shell";
import { DeltaChip, Grid, KpiCard, Panel, PlanVsActual } from "../components/ui";
import { Donut, GraficoMensal, MapaBrasil } from "../components/charts";
import { caixaDisponivel, metaPeriodo, porCanal, porUF, projecaoMes, receitaArea, resultado, serieMensal, variacao } from "../metrics";
import { brl, deltaPct, deltaPP, pct } from "../lib/format";
import { MESES_LONGOS, fromISO } from "../lib/dates";

export function Overview() {
  const { ctx, ds, intervalo, comp, periodo, irPara, usuario } = useApp();
  const d = useMemo(() => {
    const res = resultado(ctx, intervalo);
    const resC = comp ? resultado(ctx, comp) : null;
    const total = receitaArea(ctx, intervalo);
    const totalC = comp ? receitaArea(ctx, comp) : null;
    const serie = serieMensal(ctx);
    return {
      res, resC, total, totalC,
      dtc: receitaArea(ctx, intervalo, "DTC"),
      b2b: receitaArea(ctx, intervalo, "B2B"),
      plan: metaPeriodo(ctx, intervalo, periodo === "mes"),
      planDTC: metaPeriodo(ctx, intervalo, periodo === "mes", "DTC"),
      planB2B: metaPeriodo(ctx, intervalo, periodo === "mes", "B2B"),
      serie,
      ufs: porUF(ctx, intervalo),
      canais: porCanal(ctx, intervalo),
      caixa: caixaDisponivel(ctx),
      sparkReceita: serie.slice(-7).map((p) => p.projecao ?? p.realizado),
    };
  }, [ctx, intervalo, comp, periodo]);

  const mes = periodo === "mes";
  const proj = (v: number) => (mes ? projecaoMes(v, ds.hoje) : undefined);
  const nomeMes = MESES_LONGOS[fromISO(ds.hoje).getMonth()];
  const podeMetas = usuario.perfil === "admin" || usuario.perfil === "gestor";
  const cad = podeMetas ? () => irPara("metas") : undefined;
  const vLiq = (r: typeof d.res) => r.receitaBruta - r.descontos - r.devolucoes;

  return (
    <>
      <FaceHeader titulo="Overview" />
      <AvisosDados />
      <PlanVsActual
        titulo={mes ? `Faturamento de ${nomeMes}` : "Faturamento do período"}
        realizado={d.total} planejado={d.plan.planejado} esperado={d.plan.esperado} projecao={proj(d.total)} onCadastrarMeta={cad}
        delta={<DeltaChip valor={variacao(d.total, d.totalC)} texto={deltaPct(variacao(d.total, d.totalC) ?? 0)} sufixo={comp ? "vs. anterior" : undefined} />}
      />
      <Grid cols="repeat(auto-fit, minmax(300px, 1fr))">
        <PlanVsActual titulo="DTC (site + marketplaces)" compacto realizado={d.dtc} planejado={d.planDTC.planejado} esperado={d.planDTC.esperado} projecao={proj(d.dtc)} onCadastrarMeta={cad} />
        <PlanVsActual titulo="B2B" compacto realizado={d.b2b} planejado={d.planB2B.planejado} esperado={d.planB2B.esperado} projecao={proj(d.b2b)} onCadastrarMeta={cad} />
      </Grid>
      <Grid cols="" className="kpis">
        <KpiCard rotulo="Receita líquida" valor={brl(d.res.receitaLiquida)}
          delta={<DeltaChip valor={variacao(d.res.receitaLiquida, d.resC?.receitaLiquida)} texto={deltaPct(variacao(d.res.receitaLiquida, d.resC?.receitaLiquida) ?? 0)} />}
          rodape="após descontos, devoluções e impostos" serie={d.sparkReceita} />
        <KpiCard rotulo="Margem bruta" valor={pct(d.res.margemBruta)}
          delta={<DeltaChip valor={d.resC ? d.res.margemBruta - d.resC.margemBruta : null} texto={deltaPP(d.resC ? d.res.margemBruta - d.resC.margemBruta : 0)} />}
          rodape={brl(d.res.lucroBruto)} />
        <KpiCard rotulo="Margem de contribuição" valor={pct(d.res.mcPct)}
          delta={<DeltaChip valor={d.resC ? d.res.mcPct - d.resC.mcPct : null} texto={deltaPP(d.resC ? d.res.mcPct - d.resC.mcPct : 0)} />}
          rodape={brl(d.res.margemContribuicao)} />
        <KpiCard rotulo="Crescimento" valor={d.totalC ? deltaPct(variacao(vLiq(d.res), d.resC ? vLiq(d.resC) : null) ?? 0) : "—"}
          rodape={comp ? `${brl(d.total)} vs. ${brl(d.totalC ?? 0)}` : "sem histórico para comparar"} />
        <KpiCard rotulo="EBITDA" valor={brl(d.res.ebitda)}
          delta={<DeltaChip valor={variacao(d.res.ebitda, d.resC?.ebitda)} texto={deltaPct(variacao(d.res.ebitda, d.resC?.ebitda) ?? 0)} />}
          rodape={`${pct(d.res.ebitdaPct)} da receita`} dica="Depende do financeiro categorizado no Bling" />
        <KpiCard rotulo="Caixa disponível" valor={brl(d.caixa)} rodape="saldo hoje, pelas contas do Bling" dica="Depende dos lançamentos financeiros do Bling" />
      </Grid>
      <Grid cols="minmax(0, 7fr) minmax(0, 5fr)" className="grid-pareada">
        <Panel titulo="Receita mensal × meta">
          <GraficoMensal serie={d.serie} />
          <div className="bmb-pva-legend">
            <span><i className="bmb-key bmb-key-real" />Realizado</span>
            <span><i className="bmb-key bmb-key-proj" />Projeção do mês</span>
            <span><i className="bmb-key bmb-key-meta" />Planejado</span>
          </div>
        </Panel>
        <Panel titulo="Receita por estado"><MapaBrasil dados={d.ufs} /></Panel>
      </Grid>
      <Panel titulo="Receita por canal">
        <Donut partes={d.canais.map((c) => ({ nome: c.nome, valor: c.valor }))} total={d.total} rotulo="receita no período" />
      </Panel>
    </>
  );
}
