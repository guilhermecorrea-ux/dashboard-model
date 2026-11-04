import { useMemo } from "react";
import { useApp } from "../state/app";
import { AvisosDados, FaceHeader } from "../components/shell";
import { BarList, DataTable, DeltaChip, Grid, KpiCard, Panel, PlanVsActual } from "../components/ui";
import { GraficoMensal } from "../components/charts";
import { b2b, metaPeriodo, projecaoMes, serieMensal, variacao } from "../metrics";
import { brl, deltaPct, deltaPP, num, pct } from "../lib/format";

export function B2B() {
  const { ctx, ds, intervalo, comp, periodo, irPara, usuario } = useApp();
  const d = useMemo(() => ({
    a: b2b(ctx, intervalo),
    c: comp ? b2b(ctx, comp) : null,
    plan: metaPeriodo(ctx, intervalo, periodo === "mes", "B2B"),
    serie: serieMensal(ctx, "B2B"),
  }), [ctx, intervalo, comp, periodo]);
  const { a, c } = d;
  const podeMetas = usuario.perfil === "admin" || usuario.perfil === "gestor";

  return (
    <>
      <FaceHeader titulo="Performance B2B" />
      <AvisosDados />
      <PlanVsActual titulo="Receita B2B" realizado={a.receita} planejado={d.plan.planejado} esperado={d.plan.esperado}
        projecao={periodo === "mes" ? projecaoMes(a.receita, ds.hoje) : undefined}
        onCadastrarMeta={podeMetas ? () => irPara("metas") : undefined}
        delta={<DeltaChip valor={variacao(a.receita, c?.receita)} texto={deltaPct(variacao(a.receita, c?.receita) ?? 0)} sufixo={comp ? "vs. anterior" : undefined} />} />
      <Grid cols="" className="kpis">
        <KpiCard rotulo="Pedidos" valor={num(a.pedidos)} rodape={`ticket médio ${brl(a.ticket)}`}
          delta={<DeltaChip valor={variacao(a.pedidos, c?.pedidos)} texto={deltaPct(variacao(a.pedidos, c?.pedidos) ?? 0)} />} />
        <KpiCard rotulo="Clientes ativos" valor={num(a.ativos)} rodape={`${num(a.novos)} novos · ${num(a.perdidos)} perdidos`}
          dica="Compraram nos últimos 90 dias. Perdidos: compravam e pararam há 90 a 180 dias."
          delta={<DeltaChip valor={variacao(a.ativos, c?.ativos)} texto={deltaPct(variacao(a.ativos, c?.ativos) ?? 0)} />} />
        <KpiCard rotulo="Concentração top 5" valor={pct(a.top5)} rodape={`top 10: ${pct(a.top10)} da receita`}
          delta={<DeltaChip valor={c ? a.top5 - c.top5 : null} texto={deltaPP(c ? a.top5 - c.top5 : 0)} inverso />} />
        <KpiCard rotulo="Margem B2B" valor={pct(a.margem)} rodape="após custo e impostos"
          delta={<DeltaChip valor={c ? a.margem - c.margem : null} texto={deltaPP(c ? a.margem - c.margem : 0)} />} />
        <KpiCard rotulo="Prazo médio de recebimento" valor={`${num(a.prazoMedio)} dias`} rodape={a.freqMedia ? `compram a cada ${num(a.freqMedia)} dias` : ""} />
        <KpiCard rotulo="Inadimplência B2B" valor={pct(a.inadimplencia)} rodape={`${brl(a.vencido)} vencidos`} />
      </Grid>
      <Grid cols="minmax(0, 7fr) minmax(0, 5fr)" className="grid-pareada">
        <Panel titulo="Receita B2B mensal × meta"><GraficoMensal serie={d.serie} /></Panel>
        <Panel titulo="Receita por vendedor"><BarList itens={a.vendedores} /></Panel>
      </Grid>
      <Grid cols="repeat(auto-fit, minmax(360px, 1fr))">
        <Panel titulo="Receita por cliente">
          <DataTable linhas={a.ranking} colunas={[
            { titulo: "Cliente", valor: (r) => r.nome },
            { titulo: "Receita", valor: (r) => brl(r.valor), direita: true },
            { titulo: "% do total", valor: (r) => pct(a.receita ? r.valor / a.receita : 0), direita: true },
          ]} />
        </Panel>
        <Panel titulo="Clientes em risco">
          <DataTable linhas={a.emRisco} vazio="Nenhum cliente ativo passou do intervalo habitual de compra." colunas={[
            { titulo: "Cliente", valor: (r) => r.nome },
            { titulo: "Sem comprar", valor: (r) => `${r.dias} dias`, direita: true },
            { titulo: "Costuma comprar a cada", valor: (r) => `${num(r.habitual)} dias`, direita: true },
          ]} />
        </Panel>
      </Grid>
    </>
  );
}
