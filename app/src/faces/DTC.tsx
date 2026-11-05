import { useMemo, useState } from "react";
import { useApp } from "../state/app";
import { AvisoCritico, FaceHeader } from "../components/shell";
import { Abas, Bento, BarList, Card, DataTable, DeltaChip, Hero, Kpi, Segmentos, Stat } from "../components/ui";
import { Donut, GraficoMensal } from "../components/charts";
import { campanhas, cupons, dtc, metaPeriodo, porCanal, projecaoMes, serieMensal, taxaRecorrencia, trafego, variacao } from "../metrics";
import { brl, deltaAbs, deltaPct, deltaPP, mult, num, pct } from "../lib/format";

type Aba = "tendencia" | "midia" | "site" | "clientes";

export function DTC() {
  const { ctx, ds, intervalo, comp, periodo, irPara, usuario } = useApp();
  const [aba, setAba] = useState<Aba>("tendencia");
  const mes = periodo === "mes";
  const d = useMemo(() => ({
    a: dtc(ctx, intervalo),
    c: comp ? dtc(ctx, comp) : null,
    rec: taxaRecorrencia(ctx, intervalo.fim),
    recC: comp ? taxaRecorrencia(ctx, comp.fim) : null,
    plan: metaPeriodo(ctx, intervalo, mes, "DTC"),
    canais: [...porCanal(ctx, intervalo, "site"), ...porCanal(ctx, intervalo, "marketplace")].sort((x, y) => y.valor - x.valor),
    camp: campanhas(ctx, intervalo),
    cup: cupons(ctx, intervalo),
    tr: trafego(ctx, intervalo),
    serie: serieMensal(ctx, "DTC"),
  }), [ctx, intervalo, comp, mes]);
  const { a, c } = d;
  const vr = (x: number | null, y: number | null | undefined) => (x === null ? null : variacao(x, y ?? null));
  const plataformas = (["meta", "google_ads"] as const).map((p) => {
    const cs = d.camp.filter((x) => x.plataforma === p);
    const inv = cs.reduce((s, x) => s + x.investimento, 0);
    return { nome: p === "meta" ? "Meta Ads" : "Google Ads", valor: inv, extra: inv ? `ROAS informado ${mult(cs.reduce((s, x) => s + x.receita, 0) / inv)}` : undefined };
  });

  return (
    <>
      <FaceHeader titulo="Performance DTC" />
      <AvisoCritico />
      <Bento>
        <Hero i={0} titulo="Receita DTC" sub="site + marketplaces" realizado={a.receita} planejado={d.plan.planejado} esperado={d.plan.esperado}
          projecao={mes ? projecaoMes(a.receita, ds.hoje) : undefined}
          onCadastrarMeta={usuario.perfil === "admin" || usuario.perfil === "gestor" ? () => irPara("metas") : undefined}
          delta={<DeltaChip valor={variacao(a.receita, c?.receita)} texto={deltaPct(variacao(a.receita, c?.receita) ?? 0)} sufixo={comp ? "vs. anterior" : undefined} />} />
        <Card span={4} i={1} titulo="Mídia" className="card-midia">
          <Stat rotulo="ROAS de Mídia" valor={a.roas} formato={mult}
            nota={<><DeltaChip valor={a.roas && c?.roas ? a.roas - c.roas : null} texto={deltaAbs(a.roas && c?.roas ? a.roas - c.roas : 0, (n) => num(n, 1))} /> receita do site ÷ Meta + Google</>} />
          <div className="stat-par">
            <Stat rotulo="Gasto" valor={a.gasto} formato={brl} nota={<DeltaChip valor={variacao(a.gasto, c?.gasto)} texto={deltaPct(variacao(a.gasto, c?.gasto) ?? 0)} inverso />} />
            <Stat rotulo="CAC" valor={a.cac} formato={brl} nota={<DeltaChip valor={vr(a.cac, c?.cac)} texto={deltaPct(vr(a.cac, c?.cac) ?? 0)} inverso />} />
          </div>
        </Card>
        <Kpi i={2} rotulo="Ticket médio" valor={a.ticket} formato={brl} rodape={`${num(a.pedidos)} pedidos`}
          delta={<DeltaChip valor={variacao(a.ticket, c?.ticket)} texto={deltaPct(variacao(a.ticket, c?.ticket) ?? 0)} />} />
        <Kpi i={3} rotulo="Taxa de recorrência" valor={d.rec} formato={(n) => pct(n)} rodape="voltam em até 90 dias"
          delta={<DeltaChip valor={d.rec !== null && d.recC !== null ? d.rec - d.recC : null} texto={deltaPP(d.rec !== null && d.recC !== null ? d.rec - d.recC : 0)} />} />
        <Kpi i={4} rotulo="Clientes novos" valor={a.clientesNovos} formato={(n) => num(n)} rodape="no site"
          delta={<DeltaChip valor={variacao(a.clientesNovos, c?.clientesNovos)} texto={deltaPct(variacao(a.clientesNovos, c?.clientesNovos) ?? 0)} />} />
        <Kpi i={5} rotulo="Conversão do site" valor={d.tr.conversao} formato={(n) => pct(n, 2)} rodape={`${num(d.tr.sessoes)} sessões`} />
      </Bento>

      <div className="secao">
        <Abas abas={[
          { id: "tendencia", rotulo: "Tendência" }, { id: "midia", rotulo: "Mídia" },
          { id: "site", rotulo: "Site e funil" }, { id: "clientes", rotulo: "Clientes e cupons" },
        ]} ativa={aba} onChange={setAba} />
        <div className="troca" key={aba}>
          {aba === "tendencia" && (
            <Bento>
              <Card span={8} titulo="Receita DTC mensal × meta" className="card-grafico"><GraficoMensal serie={d.serie} /></Card>
              <Card span={4} titulo="Por canal"><Donut partes={d.canais.map((x) => ({ nome: x.nome, valor: x.valor }))} total={a.receita} rotulo="receita DTC" /></Card>
            </Bento>
          )}
          {aba === "midia" && (
            <Bento>
              <Card span={4} titulo="Investimento por plataforma">
                <BarList itens={plataformas} cor="violet" />
                <p className="nota">{pct(a.pctMidia)} da receita DTC foi para mídia.</p>
              </Card>
              <Card span={8} titulo="Campanhas">
                <DataTable linhas={d.camp} limite={6} colunas={[
                  { titulo: "Campanha", valor: (r) => r.campanha },
                  { titulo: "Plataforma", valor: (r) => (r.plataforma === "meta" ? "Meta" : "Google") },
                  { titulo: "Investimento", valor: (r) => brl(r.investimento), direita: true },
                  { titulo: "ROAS informado", valor: (r) => mult(r.roas), direita: true },
                ]} />
              </Card>
            </Bento>
          )}
          {aba === "site" && (
            <Bento>
              <Card span={4} titulo="Sessões por origem"><BarList itens={d.tr.origem} formato={(n) => num(n)} /></Card>
              <Card span={4} titulo="Funil">
                <BarList cor="marca" itens={d.tr.funil.map((f, i) => ({ nome: f.etapa, valor: f.valor, extra: i ? pct(f.valor / d.tr.funil[0].valor, 2) : undefined }))} formato={(n) => num(n)} />
              </Card>
              <Card span={4} titulo="Conversão por dispositivo">
                <BarList cor="lime" itens={d.tr.dispositivo.map((x) => ({ nome: x.nome, valor: x.conversao, extra: `${num(x.sessoes)} sessões` }))} formato={(n) => pct(n, 2)} />
              </Card>
            </Bento>
          )}
          {aba === "clientes" && (
            <Bento>
              <Card span={5} titulo="Receita do site por tipo de cliente">
                <Segmentos partes={[
                  { nome: "Novos", valor: a.receitaNovos, cor: "var(--brand)", nota: brl(a.receitaNovos) },
                  { nome: "Recorrentes", valor: a.receitaRecorrentes, cor: "var(--violet)", nota: brl(a.receitaRecorrentes) },
                ]} />
                <div className="stat-par">
                  <Stat rotulo="Desconto médio" valor={a.descontoMedio} formato={(n) => pct(n)} />
                  <Stat rotulo="Pedidos com cupom" valor={a.usoCupom} formato={(n) => pct(n)} />
                </div>
              </Card>
              <Card span={7} titulo="Cupons">
                <DataTable linhas={d.cup} colunas={[
                  { titulo: "Cupom", valor: (r) => <span className="tag">{r.cupom}</span> },
                  { titulo: "Pedidos", valor: (r) => num(r.pedidos), direita: true },
                  { titulo: "Desconto", valor: (r) => brl(r.desconto), direita: true },
                  { titulo: "Receita", valor: (r) => brl(r.receita), direita: true },
                ]} />
              </Card>
            </Bento>
          )}
        </div>
      </div>
    </>
  );
}
