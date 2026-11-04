import { useMemo } from "react";
import { useApp } from "../state/app";
import { AvisosDados, FaceHeader } from "../components/shell";
import { BarList, DataTable, Grid, KpiCard, Panel } from "../components/ui";
import { PRAZO_REPOSICAO_DIAS, supply } from "../metrics";
import { brl, dias, num, pct } from "../lib/format";

export function Supply() {
  const { ctx, intervalo } = useApp();
  const s = useMemo(() => supply(ctx, intervalo), [ctx, intervalo]);
  const classeCor = (c: string) => (c === "A" ? "bmb-delta-pos" : c === "B" ? "bmb-delta-flat" : "bmb-delta-neg");

  return (
    <>
      <FaceHeader titulo="Supply Chain" />
      <AvisosDados />
      <Grid cols="" className="kpis">
        <KpiCard rotulo="Estoque em valor" valor={brl(s.valor)} rodape={`${num(s.unidades)} unidades a custo`} />
        <KpiCard rotulo="Cobertura de estoque" valor={s.coberturaMedia ? dias(s.coberturaMedia) : "—"} rodape="no ritmo de venda dos últimos 30 dias" />
        <KpiCard rotulo="Ruptura" valor={pct(s.ruptura)} rodape="dos produtos ativos estão sem estoque" />
        <KpiCard rotulo="Giro de estoque" valor={s.giro ? `${num(s.giro, 1)}× ao ano` : "—"} rodape="custo das vendas em 12 meses ÷ estoque atual" />
        <KpiCard rotulo="Tempo médio de preparação" valor={s.preparacao ? dias(s.preparacao) : "—"} rodape="do pedido ao despacho" />
        <KpiCard rotulo="Estoque parado" valor={brl(s.parados.reduce((t, x) => t + x.valor, 0))} rodape={`${s.parados.length} ${s.parados.length === 1 ? "produto" : "produtos"} sem venda há 60+ dias`} />
      </Grid>
      <Grid cols="repeat(auto-fit, minmax(360px, 1fr))">
        <Panel titulo="Risco de ruptura">
          <DataTable linhas={s.emRisco} vazio="Nenhum produto com cobertura abaixo do prazo de reposição." colunas={[
            { titulo: "Produto", valor: (r) => r.nome },
            { titulo: "Estoque", valor: (r) => num(r.qtd), direita: true },
            { titulo: "Venda/dia", valor: (r) => num(r.vmd, 1), direita: true },
            { titulo: "Cobertura", valor: (r) => <span className={`bmb-delta ${r.qtd === 0 ? "bmb-delta-neg" : "bmb-delta-flat"}`}>{r.qtd === 0 ? "sem estoque" : dias(r.cobertura ?? 0)}</span>, direita: true },
          ]} />
          <p className="nota">Prazo de reposição considerado: {PRAZO_REPOSICAO_DIAS} dias.</p>
        </Panel>
        <Panel titulo="Tempo de preparação por canal">
          <BarList itens={s.preparacaoPorCanal.map((x) => ({ nome: x.nome, valor: x.dias }))} formato={(n) => dias(n)} cor="violet" />
        </Panel>
      </Grid>
      <Panel titulo="Curva ABC">
        <DataTable linhas={s.curva} limite={12} colunas={[
          { titulo: "Produto", valor: (r) => r.nome },
          { titulo: "Receita", valor: (r) => brl(r.receita), direita: true },
          { titulo: "Unidades", valor: (r) => num(r.unidades), direita: true },
          { titulo: "Margem", valor: (r) => pct(r.margem), direita: true },
          { titulo: "Acumulado", valor: (r) => pct(r.acumulado), direita: true },
          { titulo: "Classe", valor: (r) => <span className={`bmb-delta ${classeCor(r.classe)}`}>{r.classe}</span>, direita: true },
        ]} />
      </Panel>
      <Grid cols="repeat(auto-fit, minmax(360px, 1fr))">
        <Panel titulo="Estoque por produto">
          <DataTable linhas={[...s.itens].sort((a, b) => b.valor - a.valor)} colunas={[
            { titulo: "Produto", valor: (r) => r.nome },
            { titulo: "Unidades", valor: (r) => num(r.qtd), direita: true },
            { titulo: "Valor", valor: (r) => brl(r.valor), direita: true },
            { titulo: "Cobertura", valor: (r) => (r.cobertura === null ? "—" : dias(r.cobertura)), direita: true },
          ]} />
        </Panel>
        <Panel titulo="Estoque por depósito"><BarList itens={s.depositos} /></Panel>
      </Grid>
      <Panel titulo="Estoque parado">
        <DataTable linhas={s.parados} vazio="Nenhum produto sem venda há 60 dias ou mais." colunas={[
          { titulo: "Produto", valor: (r) => r.nome },
          { titulo: "Sem venda há", valor: (r) => `${r.diasSemVenda} dias`, direita: true },
          { titulo: "Unidades", valor: (r) => num(r.qtd), direita: true },
          { titulo: "Valor parado", valor: (r) => brl(r.valor), direita: true },
        ]} />
      </Panel>
    </>
  );
}
