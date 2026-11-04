import { useMemo } from "react";
import { useApp } from "../state/app";
import { AvisosDados, FaceHeader } from "../components/shell";
import { DataTable, Grid, KpiCard, Panel } from "../components/ui";
import { GraficoCaixa } from "../components/charts";
import { finance } from "../metrics";
import { brl, brlExato, num, pct } from "../lib/format";
import { fmtDia } from "../lib/dates";
import type { LancamentoFinanceiro } from "../data/types";

export function Finance() {
  const { ctx, intervalo } = useApp();
  const f = useMemo(() => finance(ctx, intervalo), [ctx, intervalo]);
  const r = f.res;
  const vendaLiq = r.receitaBruta - r.descontos - r.devolucoes;
  const pc = (v: number) => (r.receitaBruta ? pct(v / r.receitaBruta) : "—");
  const dre: { linha: string; valor: number; total?: boolean; neg?: boolean }[] = [
    { linha: "Receita bruta", valor: r.receitaBruta, total: true },
    { linha: "(−) Descontos", valor: -r.descontos, neg: true },
    { linha: "(−) Devoluções", valor: -r.devolucoes, neg: true },
    { linha: "(−) Impostos sobre vendas", valor: -r.impostos, neg: true },
    { linha: "= Receita líquida", valor: r.receitaLiquida, total: true },
    { linha: "(−) Custo das mercadorias", valor: -r.cmv, neg: true },
    { linha: "= Lucro bruto", valor: r.lucroBruto, total: true },
    { linha: "(−) Frete e logística", valor: -r.frete, neg: true },
    { linha: "(−) Mídia paga", valor: -r.midia, neg: true },
    { linha: "= Margem de contribuição", valor: r.margemContribuicao, total: true },
    ...Object.entries(r.despesasFixas).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ linha: `(−) ${k}`, valor: -v, neg: true })),
    { linha: "= EBITDA", valor: r.ebitda, total: true },
  ];
  const soma = (xs: LancamentoFinanceiro[]) => xs.reduce((s, x) => s + x.valor, 0);
  const contas = (xs: LancamentoFinanceiro[]) => [...xs].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const colContas = [
    { titulo: "Vencimento", valor: (l: LancamentoFinanceiro) => fmtDia(l.vencimento) },
    { titulo: "Descrição", valor: (l: LancamentoFinanceiro) => l.descricao },
    { titulo: "Categoria", valor: (l: LancamentoFinanceiro) => l.categoria },
    { titulo: "Valor", valor: (l: LancamentoFinanceiro) => brl(l.valor), direita: true },
  ];

  return (
    <>
      <FaceHeader titulo="Finance" />
      <AvisosDados />
      <Grid cols="" className="kpis">
        <KpiCard rotulo="Caixa disponível" valor={brl(f.caixa)} rodape={`previsto em 90 dias: ${brl(f.saldo90)}`} />
        <KpiCard rotulo="A receber vencido" valor={brl(soma(f.receberVencido))} rodape={`inadimplência ${pct(f.inadimplencia)}`} />
        <KpiCard rotulo="A pagar vencido" valor={brl(soma(f.pagarVencido))} rodape={`${f.pagarVencido.length} contas`} />
        <KpiCard rotulo="Ciclo de caixa" valor={`${num(f.ciclo.total)} dias`} rodape={`receber ${num(f.ciclo.pmr)} + estoque ${num(f.ciclo.die)} − pagar ${num(f.ciclo.pmp)}`} />
        <KpiCard rotulo="Impostos sobre vendas" valor={brl(r.impostos)} rodape={`${vendaLiq ? pct(r.impostos / vendaLiq) : "—"} da receita`} />
        <KpiCard rotulo="Ponto de equilíbrio" valor={f.pontoEquilibrio ? brl(f.pontoEquilibrio) : "—"} rodape="receita que cobre as despesas fixas do período" />
      </Grid>
      <Grid cols="minmax(0, 5fr) minmax(0, 7fr)" className="grid-pareada">
        <Panel titulo="DRE gerencial">
          <div className="bmb-table-wrap">
            <table className="bmb-table dre">
              <thead><tr><th>Linha</th><th className="r">Valor</th><th className="r">% receita bruta</th></tr></thead>
              <tbody>
                {dre.map((l) => (
                  <tr key={l.linha} className={l.total ? "total" : ""}>
                    <td>{l.linha}</td><td className="r">{brlExato(l.valor)}</td><td className="r">{pc(Math.abs(l.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nota">Despesas do Bling rateadas pelos dias do período. A DRE só é confiável com o financeiro categorizado.</p>
        </Panel>
        <Panel titulo="Fluxo de caixa previsto (13 semanas)">
          <GraficoCaixa semanas={f.semanas} />
          <div className="bmb-pva-legend">
            <span><i className="bmb-key" style={{ background: "var(--brand)" }} />Entradas</span>
            <span><i className="bmb-key" style={{ background: "var(--violet)" }} />Saídas</span>
            <span><i className="bmb-key bmb-key-meta" style={{ background: "var(--lime)" }} />Saldo previsto</span>
          </div>
        </Panel>
      </Grid>
      <Grid cols="repeat(auto-fit, minmax(360px, 1fr))">
        <Panel titulo={`A pagar nos próximos 30 dias · ${brl(soma(f.pagar30))}`}><DataTable linhas={contas(f.pagar30)} colunas={colContas} /></Panel>
        <Panel titulo={`A receber nos próximos 30 dias · ${brl(soma(f.receber30))}`}><DataTable linhas={contas(f.receber30)} colunas={colContas} /></Panel>
      </Grid>
      <Grid cols="repeat(auto-fit, minmax(360px, 1fr))">
        <Panel titulo="Contas a pagar vencidas"><DataTable linhas={contas(f.pagarVencido)} colunas={colContas} vazio="Nenhuma conta a pagar vencida." /></Panel>
        <Panel titulo="Contas a receber vencidas"><DataTable linhas={contas(f.receberVencido)} colunas={colContas} vazio="Nenhuma conta a receber vencida." /></Panel>
      </Grid>
    </>
  );
}
