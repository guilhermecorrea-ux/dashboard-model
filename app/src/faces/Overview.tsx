import { useMemo, useState } from "react";
import { useApp } from "../state/app";
import { AvisoCritico, FaceHeader } from "../components/shell";
import { Abas, Bento, BarraMeta, Capsulas, Card, DeltaChip, Hero, Kpi } from "../components/ui";
import { Donut, GraficoMensal, MapaBrasil } from "../components/charts";
import { metaPeriodo, porCanal, porUF, projecaoMes, receitaArea, resultado, serieMensal, variacao } from "../metrics";
import { brl, deltaPct, deltaPP, pct } from "../lib/format";
import { MESES_LONGOS, fromISO } from "../lib/dates";

export function Overview() {
  const { ctx, ds, intervalo, comp, periodo, irPara, usuario } = useApp();
  const [aba, setAba] = useState<"estados" | "canais">("estados");
  const mes = periodo === "mes";
  const d = useMemo(() => {
    const res = resultado(ctx, intervalo);
    const resC = comp ? resultado(ctx, comp) : null;
    const serie = serieMensal(ctx);
    const total = receitaArea(ctx, intervalo);
    return {
      res, resC, serie, total,
      totalC: comp ? receitaArea(ctx, comp) : null,
      dtc: receitaArea(ctx, intervalo, "DTC"),
      b2b: receitaArea(ctx, intervalo, "B2B"),
      plan: metaPeriodo(ctx, intervalo, mes),
      planDTC: metaPeriodo(ctx, intervalo, mes, "DTC"),
      planB2B: metaPeriodo(ctx, intervalo, mes, "B2B"),
      ufs: porUF(ctx, intervalo),
      canais: porCanal(ctx, intervalo),
    };
  }, [ctx, intervalo, comp, mes]);

  const proj = (v: number) => (mes ? projecaoMes(v, ds.hoje) : undefined);
  const nomeMes = MESES_LONGOS[fromISO(ds.hoje).getMonth()];
  const cad = usuario.perfil === "admin" || usuario.perfil === "gestor" ? () => irPara("metas") : undefined;
  const ating = (r: number, p: number) => (p > 0 ? r / p : 0);
  const varTotal = variacao(d.total, d.totalC);
  const spark = (f: (x: (typeof d.serie)[number]) => number) => d.serie.slice(-8).map(f);
  const ritmo = d.plan.esperado ? d.total / d.plan.esperado : null;

  return (
    <>
      <FaceHeader titulo="Overview" />
      <AvisoCritico />
      <Bento>
        <Hero i={0} titulo={mes ? `Faturamento de ${nomeMes}` : "Faturamento do período"} sub="site, marketplaces e B2B"
          realizado={d.total} planejado={d.plan.planejado} esperado={d.plan.esperado} projecao={proj(d.total)} onCadastrarMeta={cad}
          delta={<DeltaChip valor={varTotal} texto={deltaPct(varTotal ?? 0)} sufixo={comp ? "vs. anterior" : undefined} />}>
          <div className="hero-areas">
            {[
              { nome: "DTC", r: d.dtc, p: d.planDTC.planejado, pr: proj(d.dtc) },
              { nome: "B2B", r: d.b2b, p: d.planB2B.planejado, pr: proj(d.b2b) },
            ].map((a) => (
              <div key={a.nome} className="hero-area">
                <div className="hero-area-top"><span>{a.nome}</span><b>{brl(a.r)}</b><em>{a.p ? `${pct(ating(a.r, a.p), 0)} da meta` : "sem meta"}</em></div>
                <BarraMeta fina realizado={a.r} planejado={a.p} projecao={a.pr} />
              </div>
            ))}
          </div>
        </Hero>
        <Card span={4} i={1} titulo="Pulso das metas" className="card-capsulas">
          <Capsulas
            centro={pct(ating(d.total, d.plan.planejado), 0)}
            rotuloCentro={ritmo === null ? "da meta" : `da meta · ritmo ${pct(ritmo, 0)}`}
            itens={[
              { nome: "Total", valor: ating(d.total, d.plan.planejado), cor: "var(--brand)" },
              { nome: "DTC", valor: ating(d.dtc, d.planDTC.planejado), cor: "var(--violet)" },
              { nome: "B2B", valor: ating(d.b2b, d.planB2B.planejado), cor: "var(--lime)" },
            ]} />
        </Card>

        <Kpi i={2} rotulo="Receita líquida" valor={d.res.receitaLiquida} formato={brl} serie={spark((p) => p.projecao ?? p.realizado)}
          delta={<DeltaChip valor={variacao(d.res.receitaLiquida, d.resC?.receitaLiquida)} texto={deltaPct(variacao(d.res.receitaLiquida, d.resC?.receitaLiquida) ?? 0)} />}
          rodape="após descontos e impostos" />
        <Kpi i={3} rotulo="Margem bruta" valor={d.res.margemBruta} formato={(n) => pct(n)}
          delta={<DeltaChip valor={d.resC ? d.res.margemBruta - d.resC.margemBruta : null} texto={deltaPP(d.resC ? d.res.margemBruta - d.resC.margemBruta : 0)} />}
          rodape={brl(d.res.lucroBruto)} />
        <Kpi i={4} rotulo="Margem de contribuição" valor={d.res.mcPct} formato={(n) => pct(n)}
          delta={<DeltaChip valor={d.resC ? d.res.mcPct - d.resC.mcPct : null} texto={deltaPP(d.resC ? d.res.mcPct - d.resC.mcPct : 0)} />}
          rodape={brl(d.res.margemContribuicao)} />
        <Kpi i={5} rotulo="EBITDA" valor={d.res.ebitda} formato={brl} dica="Depende do financeiro categorizado no Bling"
          delta={<DeltaChip valor={variacao(d.res.ebitda, d.resC?.ebitda)} texto={deltaPct(variacao(d.res.ebitda, d.resC?.ebitda) ?? 0)} />}
          rodape={`${pct(d.res.ebitdaPct)} da receita`} />

        <Card span={8} i={6} titulo="Receita mensal × meta" className="card-grafico"
          acao={<div className="legenda-mini"><span><i className="chave chave-real" />Realizado</span><span><i className="chave chave-proj" />Projeção</span><span><i className="chave chave-meta" />Meta</span></div>}>
          <GraficoMensal serie={d.serie} />
        </Card>
        <Card span={4} i={7} titulo={aba === "estados" ? "Onde vendemos" : "Por canal"} acao={
          <Abas pequeno abas={[{ id: "estados", rotulo: "Estados" }, { id: "canais", rotulo: "Canais" }]} ativa={aba} onChange={setAba} />
        }>
          <div className="troca" key={aba}>
            {aba === "estados"
              ? <MapaBrasil dados={d.ufs} />
              : <Donut partes={d.canais.map((c) => ({ nome: c.nome, valor: c.valor }))} total={d.total} rotulo="no período" />}
          </div>
        </Card>
      </Bento>
    </>
  );
}
