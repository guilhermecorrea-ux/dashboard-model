import { useMemo, useState } from "react";
import { useApp } from "../state/app";
import { AvisoCritico, FaceHeader } from "../components/shell";
import { Abas, Bento, Card, DataTable, Kpi, Stat, type Coluna } from "../components/ui";
import { Num } from "../components/motion";
import { GraficoCaixa } from "../components/charts";
import { finance } from "../metrics";
import { brl, brlExato, num, pct } from "../lib/format";
import { fmtDia } from "../lib/dates";
import type { LancamentoFinanceiro } from "../data/types";

type Aba = "dre" | "pagar" | "receber" | "vencidas";

export function Finance() {
  const { ctx, intervalo } = useApp();
  const [aba, setAba] = useState<Aba>("dre");
  const f = useMemo(() => finance(ctx, intervalo), [ctx, intervalo]);
  const r = f.res;
  const vendaLiq = r.receitaBruta - r.descontos - r.devolucoes;
  const pcB = (v: number) => (r.receitaBruta ? pct(v / r.receitaBruta) : "—");
  const soma = (xs: LancamentoFinanceiro[]) => xs.reduce((s, x) => s + x.valor, 0);
  const ord = (xs: LancamentoFinanceiro[]) => [...xs].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const col: Coluna<LancamentoFinanceiro>[] = [
    { titulo: "Vencimento", valor: (l) => fmtDia(l.vencimento) },
    { titulo: "Descrição", valor: (l) => l.descricao },
    { titulo: "Categoria", valor: (l) => <span className="tag">{l.categoria}</span> },
    { titulo: "Valor", valor: (l) => brl(l.valor), direita: true },
  ];
  const dre: { linha: string; valor: number; total?: boolean }[] = [
    { linha: "Receita bruta", valor: r.receitaBruta, total: true },
    { linha: "Descontos e devoluções", valor: -(r.descontos + r.devolucoes) },
    { linha: "Impostos sobre vendas", valor: -r.impostos },
    { linha: "Receita líquida", valor: r.receitaLiquida, total: true },
    { linha: "Custo das mercadorias", valor: -r.cmv },
    { linha: "Lucro bruto", valor: r.lucroBruto, total: true },
    { linha: "Frete e logística", valor: -r.frete },
    { linha: "Mídia paga", valor: -r.midia },
    { linha: "Margem de contribuição", valor: r.margemContribuicao, total: true },
    ...Object.entries(r.despesasFixas).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ linha: k, valor: -v })),
    { linha: "EBITDA", valor: r.ebitda, total: true },
  ];
  const p30 = soma(f.pagar30), r30 = soma(f.receber30);

  return (
    <>
      <FaceHeader titulo="Finance" />
      <AvisoCritico />
      <Bento>
        <section className="card span-8 card-destaque hero hero-caixa" style={{ "--i": 0 } as React.CSSProperties}>
          <div className="hero-top">
            <div><span className="bmb-label">Caixa disponível</span><p className="hero-sub">saldo hoje e previsão para 13 semanas</p></div>
            <span className={`bmb-delta ${f.saldo90 >= f.caixa ? "bmb-delta-pos" : "bmb-delta-neg"}`}>{f.saldo90 >= f.caixa ? "▲" : "▼"} {brl(f.saldo90)} em 90 dias</span>
          </div>
          <div className="hero-numero"><Num valor={f.caixa} formato={brl} /></div>
          <div className="hero-grafico"><GraficoCaixa semanas={f.semanas} /></div>
          <div className="hero-legenda">
            <span><i className="chave" style={{ background: "var(--brand)" }} />Entradas</span>
            <span><i className="chave" style={{ background: "var(--violet)" }} />Saídas</span>
            <span><i className="chave chave-meta" />Saldo previsto</span>
          </div>
        </section>
        <Card span={4} i={1} titulo="Próximos 30 dias" className="card-30">
          <Stat rotulo="A receber" valor={r30} formato={brl} tom="pos" nota={`${f.receber30.length} títulos`} />
          <Stat rotulo="A pagar" valor={p30} formato={brl} tom="neg" nota={`${f.pagar30.length} contas`} />
          <div className="saldo-30">
            <span className="bmb-label">Diferença</span>
            <b className={r30 - p30 >= 0 ? "txt-pos" : "txt-neg"}>{brl(r30 - p30)}</b>
          </div>
        </Card>
        <Kpi i={2} rotulo="EBITDA do período" valor={r.ebitda} formato={brl} rodape={`${pct(r.ebitdaPct)} da receita`} dica="Depende do financeiro categorizado no Bling" />
        <Kpi i={3} rotulo="Ciclo de caixa" valor={f.ciclo.total} formato={(n) => `${num(n)} dias`} rodape={`receber ${num(f.ciclo.pmr)} + estoque ${num(f.ciclo.die)} − pagar ${num(f.ciclo.pmp)}`} />
        <Kpi i={4} rotulo="Inadimplência" valor={f.inadimplencia} formato={(n) => pct(n)} rodape={`${brl(soma(f.receberVencido))} vencidos`} />
        <Kpi i={5} rotulo="Ponto de equilíbrio" valor={f.pontoEquilibrio} formato={brl} rodape={`impostos ${vendaLiq ? pct(r.impostos / vendaLiq) : "—"} da receita`} />
      </Bento>

      <div className="secao">
        <Abas abas={[
          { id: "dre", rotulo: "DRE" }, { id: "pagar", rotulo: `A pagar · ${f.pagar30.length}` },
          { id: "receber", rotulo: `A receber · ${f.receber30.length}` }, { id: "vencidas", rotulo: `Vencidas · ${f.pagarVencido.length + f.receberVencido.length}` },
        ]} ativa={aba} onChange={setAba} />
        <div className="troca" key={aba}>
          {aba === "dre" && (
            <Bento>
              <Card span={12} titulo="DRE gerencial do período">
                <div className="dre">
                  {dre.map((l, k) => (
                    <div key={l.linha} className={`dre-linha ${l.total ? "dre-total" : ""}`} style={{ "--i": k } as React.CSSProperties}>
                      <span>{l.total ? l.linha : `(−) ${l.linha}`}</span>
                      <span className="dre-barra"><i style={{ width: `${Math.min(100, (Math.abs(l.valor) / (r.receitaBruta || 1)) * 100)}%` }} className={l.total ? "" : "neg"} /></span>
                      <b>{brlExato(l.valor)}</b>
                      <em>{pcB(Math.abs(l.valor))}</em>
                    </div>
                  ))}
                </div>
                <p className="nota">Percentuais sobre a receita bruta. Despesas do Bling rateadas pelos dias do período.</p>
              </Card>
            </Bento>
          )}
          {aba === "pagar" && <Bento><Card span={12} titulo={`A pagar nos próximos 30 dias · ${brl(p30)}`}><DataTable linhas={ord(f.pagar30)} colunas={col} /></Card></Bento>}
          {aba === "receber" && <Bento><Card span={12} titulo={`A receber nos próximos 30 dias · ${brl(r30)}`}><DataTable linhas={ord(f.receber30)} colunas={col} /></Card></Bento>}
          {aba === "vencidas" && (
            <Bento>
              <Card span={6} titulo={`A pagar vencidas · ${brl(soma(f.pagarVencido))}`}><DataTable linhas={ord(f.pagarVencido)} colunas={col} vazio="Nenhuma conta a pagar vencida." /></Card>
              <Card span={6} titulo={`A receber vencidas · ${brl(soma(f.receberVencido))}`}><DataTable linhas={ord(f.receberVencido)} colunas={col} vazio="Nenhuma conta a receber vencida." /></Card>
            </Bento>
          )}
        </div>
      </div>
    </>
  );
}
