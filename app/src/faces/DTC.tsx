import { useMemo } from "react";
import { useApp } from "../state/app";
import { AvisosDados, FaceHeader } from "../components/shell";
import { BarList, DataTable, DeltaChip, Grid, KpiCard, Panel, PlanVsActual } from "../components/ui";
import { Donut, GraficoMensal } from "../components/charts";
import { campanhas, cupons, dtc, metaPeriodo, porCanal, projecaoMes, serieMensal, taxaRecorrencia, trafego, variacao } from "../metrics";
import { brl, deltaAbs, deltaPct, deltaPP, mult, num, pct } from "../lib/format";

export function DTC() {
  const { ctx, ds, intervalo, comp, periodo, irPara, usuario } = useApp();
  const d = useMemo(() => {
    const a = dtc(ctx, intervalo);
    const c = comp ? dtc(ctx, comp) : null;
    const canais = [...porCanal(ctx, intervalo, "site"), ...porCanal(ctx, intervalo, "marketplace")].sort((x, y) => y.valor - x.valor);
    return {
      a, c,
      rec: taxaRecorrencia(ctx, intervalo.fim),
      recC: comp ? taxaRecorrencia(ctx, comp.fim) : null,
      plan: metaPeriodo(ctx, intervalo, periodo === "mes", "DTC"),
      canais,
      camp: campanhas(ctx, intervalo),
      cup: cupons(ctx, intervalo),
      tr: trafego(ctx, intervalo),
      serie: serieMensal(ctx, "DTC"),
    };
  }, [ctx, intervalo, comp, periodo]);
  const { a, c } = d;
  const v = (x: number | null, y: number | null | undefined) => (x === null ? null : variacao(x, y ?? null));
  const podeMetas = usuario.perfil === "admin" || usuario.perfil === "gestor";
  const plataformas = ["meta", "google_ads"].map((p) => {
    const cs = d.camp.filter((x) => x.plataforma === p);
    const inv = cs.reduce((s, x) => s + x.investimento, 0);
    return { nome: p === "meta" ? "Meta Ads" : "Google Ads", valor: inv, extra: inv ? `ROAS informado ${mult(cs.reduce((s, x) => s + x.receita, 0) / inv)}` : undefined };
  });

  return (
    <>
      <FaceHeader titulo="Performance DTC" />
      <AvisosDados />
      <PlanVsActual titulo="Receita DTC" realizado={a.receita} planejado={d.plan.planejado} esperado={d.plan.esperado}
        projecao={periodo === "mes" ? projecaoMes(a.receita, ds.hoje) : undefined}
        onCadastrarMeta={podeMetas ? () => irPara("metas") : undefined}
        delta={<DeltaChip valor={variacao(a.receita, c?.receita)} texto={deltaPct(variacao(a.receita, c?.receita) ?? 0)} sufixo={comp ? "vs. anterior" : undefined} />} />
      <Grid cols="" className="kpis">
        <KpiCard rotulo="Gasto em mídia" valor={brl(a.gasto)} rodape={`${pct(a.pctMidia)} da receita DTC`}
          delta={<DeltaChip valor={variacao(a.gasto, c?.gasto)} texto={deltaPct(variacao(a.gasto, c?.gasto) ?? 0)} inverso />} />
        <KpiCard rotulo="ROAS de Mídia" valor={a.roas ? mult(a.roas) : "—"} rodape="receita do site ÷ Meta + Google"
          dica="Receita do site (Shopify, pedidos pagos) dividida pelo investimento em Meta Ads + Google Ads"
          delta={<DeltaChip valor={a.roas && c?.roas ? a.roas - c.roas : null} texto={deltaAbs(a.roas && c?.roas ? a.roas - c.roas : 0, (n) => num(n, 1))} />} />
        <KpiCard rotulo="Ticket médio" valor={brl(a.ticket)} rodape={`${num(a.pedidos)} pedidos`}
          delta={<DeltaChip valor={variacao(a.ticket, c?.ticket)} texto={deltaPct(variacao(a.ticket, c?.ticket) ?? 0)} />} />
        <KpiCard rotulo="CAC" valor={a.cac ? brl(a.cac) : "—"} rodape={`${num(a.clientesNovos)} clientes novos no site`}
          delta={<DeltaChip valor={v(a.cac, c?.cac)} texto={deltaPct(v(a.cac, c?.cac) ?? 0)} inverso />} />
        <KpiCard rotulo="Taxa de recorrência" valor={d.rec === null ? "—" : pct(d.rec)} rodape="voltam a comprar em até 90 dias"
          delta={<DeltaChip valor={d.rec !== null && d.recC !== null ? d.rec - d.recC : null} texto={deltaPP(d.rec !== null && d.recC !== null ? d.rec - d.recC : 0)} />} />
      </Grid>
      <Grid cols="minmax(0, 7fr) minmax(0, 5fr)" className="grid-pareada">
        <Panel titulo="Receita DTC mensal × meta"><GraficoMensal serie={d.serie} /></Panel>
        <Panel titulo="Receita por canal">
          <Donut partes={d.canais.map((x) => ({ nome: x.nome, valor: x.valor }))} total={a.receita} rotulo="receita DTC" />
        </Panel>
      </Grid>
      <Grid cols="repeat(auto-fit, minmax(320px, 1fr))">
        <Panel titulo="Clientes do site">
          <BarList itens={[
            { nome: "Clientes novos", valor: a.receitaNovos, extra: `${num(a.clientesNovos)} clientes` },
            { nome: "Clientes recorrentes", valor: a.receitaRecorrentes },
          ]} />
          <div className="mini-kpis">
            <div><span className="bmb-label">Desconto médio</span><b>{pct(a.descontoMedio)}</b></div>
            <div><span className="bmb-label">Pedidos com cupom</span><b>{pct(a.usoCupom)}</b></div>
          </div>
        </Panel>
        <Panel titulo="Investimento por plataforma"><BarList itens={plataformas} cor="violet" /></Panel>
      </Grid>
      <Panel titulo="Campanhas">
        <DataTable linhas={d.camp} colunas={[
          { titulo: "Campanha", valor: (r) => r.campanha },
          { titulo: "Plataforma", valor: (r) => (r.plataforma === "meta" ? "Meta Ads" : "Google Ads") },
          { titulo: "Investimento", valor: (r) => brl(r.investimento), direita: true },
          { titulo: "Receita informada", valor: (r) => brl(r.receita), direita: true },
          { titulo: "ROAS informado", valor: (r) => mult(r.roas), direita: true },
        ]} />
        <p className="nota">ROAS informado é o que cada plataforma atribui a si mesma. O ROAS de Mídia acima usa a receita real do site.</p>
      </Panel>
      <Grid cols="repeat(auto-fit, minmax(320px, 1fr))">
        <Panel titulo="Sessões por origem">
          <BarList itens={d.tr.origem} formato={(n) => num(n)} />
          <div className="mini-kpis">
            <div><span className="bmb-label">Sessões</span><b>{num(d.tr.sessoes)}</b></div>
            <div><span className="bmb-label">Taxa de conversão</span><b>{pct(d.tr.conversao, 2)}</b></div>
          </div>
        </Panel>
        <Panel titulo="Funil do site">
          <BarList itens={d.tr.funil.map((f, i) => ({ nome: f.etapa, valor: f.valor, extra: i ? pct(f.valor / d.tr.funil[0].valor, 2) : undefined }))} formato={(n) => num(n)} cor="lime" />
        </Panel>
        <Panel titulo="Conversão por dispositivo">
          <BarList itens={d.tr.dispositivo.map((x) => ({ nome: x.nome, valor: x.conversao, extra: `${num(x.sessoes)} sessões` }))} formato={(n) => pct(n, 2)} />
        </Panel>
      </Grid>
      <Panel titulo="Cupons">
        <DataTable linhas={d.cup} colunas={[
          { titulo: "Cupom", valor: (r) => r.cupom },
          { titulo: "Pedidos", valor: (r) => num(r.pedidos), direita: true },
          { titulo: "Desconto dado", valor: (r) => brl(r.desconto), direita: true },
          { titulo: "Receita", valor: (r) => brl(r.receita), direita: true },
        ]} />
      </Panel>
    </>
  );
}
