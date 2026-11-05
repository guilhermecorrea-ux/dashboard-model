import { useMemo, useState } from "react";
import { useApp } from "../state/app";
import { AvisoCritico, FaceHeader } from "../components/shell";
import { Abas, Bento, BarList, Card, DataTable, DeltaChip, Hero, Kpi, Segmentos, Stat } from "../components/ui";
import { GraficoMensal } from "../components/charts";
import { b2b, metaPeriodo, projecaoMes, serieMensal, variacao } from "../metrics";
import { brl, deltaPct, deltaPP, num, pct } from "../lib/format";

type Aba = "tendencia" | "clientes";

export function B2B() {
  const { ctx, ds, intervalo, comp, periodo, irPara, usuario } = useApp();
  const [aba, setAba] = useState<Aba>("tendencia");
  const mes = periodo === "mes";
  const d = useMemo(() => ({
    a: b2b(ctx, intervalo),
    c: comp ? b2b(ctx, comp) : null,
    plan: metaPeriodo(ctx, intervalo, mes, "B2B"),
    serie: serieMensal(ctx, "B2B"),
  }), [ctx, intervalo, comp, mes]);
  const { a, c } = d;

  return (
    <>
      <FaceHeader titulo="Performance B2B" />
      <AvisoCritico />
      <Bento>
        <Hero i={0} titulo="Receita B2B" sub="atacado e representantes" realizado={a.receita} planejado={d.plan.planejado} esperado={d.plan.esperado}
          projecao={mes ? projecaoMes(a.receita, ds.hoje) : undefined}
          onCadastrarMeta={usuario.perfil === "admin" || usuario.perfil === "gestor" ? () => irPara("metas") : undefined}
          delta={<DeltaChip valor={variacao(a.receita, c?.receita)} texto={deltaPct(variacao(a.receita, c?.receita) ?? 0)} sufixo={comp ? "vs. anterior" : undefined} />} />
        <Card span={4} i={1} titulo="Carteira">
          <Stat rotulo="Clientes ativos" valor={a.ativos} formato={(n) => num(n)} nota="compraram nos últimos 90 dias" />
          <Segmentos partes={[
            { nome: "Novos no período", valor: Math.max(a.novos, 0.0001), cor: "var(--brand)", nota: num(a.novos) },
            { nome: "Em risco", valor: Math.max(a.emRisco.length, 0.0001), cor: "var(--warning)", nota: num(a.emRisco.length) },
            { nome: "Perdidos", valor: Math.max(a.perdidos, 0.0001), cor: "var(--negative)", nota: num(a.perdidos) },
          ]} />
        </Card>
        <Kpi i={2} rotulo="Ticket médio" valor={a.ticket} formato={brl} rodape={`${num(a.pedidos)} pedidos`}
          delta={<DeltaChip valor={variacao(a.ticket, c?.ticket)} texto={deltaPct(variacao(a.ticket, c?.ticket) ?? 0)} />} />
        <Kpi i={3} rotulo="Concentração top 5" valor={a.top5} formato={(n) => pct(n)} rodape={`top 10: ${pct(a.top10)}`}
          delta={<DeltaChip valor={c ? a.top5 - c.top5 : null} texto={deltaPP(c ? a.top5 - c.top5 : 0)} inverso />} />
        <Kpi i={4} rotulo="Margem B2B" valor={a.margem} formato={(n) => pct(n)} rodape="após custo e impostos"
          delta={<DeltaChip valor={c ? a.margem - c.margem : null} texto={deltaPP(c ? a.margem - c.margem : 0)} />} />
        <Kpi i={5} rotulo="Inadimplência" valor={a.inadimplencia} formato={(n) => pct(n)} rodape={`prazo médio ${num(a.prazoMedio)} dias`} />
      </Bento>

      <div className="secao">
        <Abas abas={[{ id: "tendencia", rotulo: "Tendência" }, { id: "clientes", rotulo: "Clientes" }]} ativa={aba} onChange={setAba} />
        <div className="troca" key={aba}>
          {aba === "tendencia" && (
            <Bento>
              <Card span={8} titulo="Receita B2B mensal × meta" className="card-grafico"><GraficoMensal serie={d.serie} /></Card>
              <Card span={4} titulo="Por vendedor"><BarList itens={a.vendedores} /></Card>
            </Bento>
          )}
          {aba === "clientes" && (
            <Bento>
              <Card span={7} titulo="Maiores clientes no período">
                <DataTable linhas={a.ranking} limite={7} colunas={[
                  { titulo: "Cliente", valor: (r) => r.nome },
                  { titulo: "Receita", valor: (r) => brl(r.valor), direita: true },
                  { titulo: "% do total", valor: (r) => pct(a.receita ? r.valor / a.receita : 0), direita: true },
                ]} />
              </Card>
              <Card span={5} titulo="Clientes em risco">
                <DataTable linhas={a.emRisco} limite={7} vazio="Nenhum cliente ativo passou do intervalo habitual de compra." colunas={[
                  { titulo: "Cliente", valor: (r) => r.nome },
                  { titulo: "Sem comprar", valor: (r) => `${r.dias} dias`, direita: true },
                ]} />
                {a.freqMedia && <p className="nota">Em média, os clientes compram a cada {num(a.freqMedia)} dias.</p>}
              </Card>
            </Bento>
          )}
        </div>
      </div>
    </>
  );
}
