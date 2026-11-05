import { useMemo, useState } from "react";
import { useApp } from "../state/app";
import { AvisoCritico, FaceHeader } from "../components/shell";
import { Abas, Bento, BarList, Card, DataTable, Kpi, Segmentos, Stat } from "../components/ui";
import { Num } from "../components/motion";
import { PRAZO_REPOSICAO_DIAS, supply } from "../metrics";
import { brl, dias, num, pct } from "../lib/format";

type Aba = "atencao" | "abc" | "estoque";

export function Supply() {
  const { ctx, intervalo } = useApp();
  const [aba, setAba] = useState<Aba>("atencao");
  const s = useMemo(() => supply(ctx, intervalo), [ctx, intervalo]);
  const faixas = useMemo(() => {
    const f = { ruptura: 0, risco: 0, ok: 0, folga: 0, parado: 0 };
    for (const x of s.itens) {
      if (x.diasSemVenda >= 60) f.parado++;
      else if (x.qtd === 0) f.ruptura++;
      else if ((x.cobertura ?? 0) < PRAZO_REPOSICAO_DIAS) f.risco++;
      else if ((x.cobertura ?? 0) <= 45) f.ok++;
      else f.folga++;
    }
    return f;
  }, [s]);
  const valorParado = s.parados.reduce((t, x) => t + x.valor, 0);
  const plural = (n: number) => `${n} ${n === 1 ? "produto" : "produtos"}`;

  return (
    <>
      <FaceHeader titulo="Supply Chain" />
      <AvisoCritico />
      <Bento>
        <section className="card span-8 card-destaque hero" style={{ "--i": 0 } as React.CSSProperties}>
          <div className="hero-top"><div><span className="bmb-label">Estoque em valor</span><p className="hero-sub">a custo, todos os depósitos</p></div></div>
          <div className="hero-numero"><Num valor={s.valor} formato={brl} /></div>
          <div className="hero-meta"><span><b>{num(s.unidades)}</b> unidades · cobertura média de <b>{s.coberturaMedia ? dias(s.coberturaMedia) : "—"}</b></span></div>
          <Segmentos partes={[
            { nome: "Sem estoque", valor: faixas.ruptura, cor: "var(--negative)", nota: plural(faixas.ruptura) },
            { nome: `Abaixo de ${PRAZO_REPOSICAO_DIAS} dias`, valor: faixas.risco, cor: "var(--warning)", nota: plural(faixas.risco) },
            { nome: "15 a 45 dias", valor: faixas.ok, cor: "var(--brand)", nota: plural(faixas.ok) },
            { nome: "Mais de 45 dias", valor: faixas.folga, cor: "var(--violet)", nota: plural(faixas.folga) },
            { nome: "Parados (60+ dias)", valor: faixas.parado, cor: "var(--ink-muted)", nota: plural(faixas.parado) },
          ]} />
        </section>
        <div className="card span-4 card-prep" style={{ "--i": 1 } as React.CSSProperties}>
          <Stat rotulo="Tempo médio de preparação" valor={s.preparacao} formato={dias} nota="do pedido ao despacho" />
          <BarList cor="violet" itens={s.preparacaoPorCanal.map((x) => ({ nome: x.nome, valor: x.dias }))} formato={(n) => dias(n)} />
        </div>
        <Kpi i={2} rotulo="Cobertura" valor={s.coberturaMedia} formato={dias} rodape="ritmo dos últimos 30 dias" />
        <Kpi i={3} rotulo="Ruptura" valor={s.ruptura} formato={(n) => pct(n)} rodape="dos produtos ativos" />
        <Kpi i={4} rotulo="Giro de estoque" valor={s.giro} formato={(n) => `${num(n, 1)}× ao ano`} rodape="custo das vendas ÷ estoque" />
        <Kpi i={5} rotulo="Estoque parado" valor={valorParado} formato={brl} rodape={`${plural(s.parados.length)} há 60+ dias`} />
      </Bento>

      <div className="secao">
        <Abas abas={[{ id: "atencao", rotulo: "Pede atenção" }, { id: "abc", rotulo: "Curva ABC" }, { id: "estoque", rotulo: "Estoque" }]} ativa={aba} onChange={setAba} />
        <div className="troca" key={aba}>
          {aba === "atencao" && (
            <Bento>
              <Card span={7} titulo="Risco de ruptura">
                <DataTable linhas={s.emRisco} vazio="Nenhum produto abaixo do prazo de reposição." colunas={[
                  { titulo: "Produto", valor: (r) => r.nome },
                  { titulo: "Estoque", valor: (r) => num(r.qtd), direita: true },
                  { titulo: "Venda/dia", valor: (r) => num(r.vmd, 1), direita: true },
                  { titulo: "Cobertura", valor: (r) => <span className={`bmb-delta ${r.qtd === 0 ? "bmb-delta-neg" : "bmb-delta-flat"}`}>{r.qtd === 0 ? "sem estoque" : dias(r.cobertura ?? 0)}</span>, direita: true },
                ]} />
                <p className="nota">Prazo de reposição considerado: {PRAZO_REPOSICAO_DIAS} dias.</p>
              </Card>
              <Card span={5} titulo="Estoque parado">
                <DataTable linhas={s.parados} vazio="Nenhum produto parado há 60 dias ou mais." colunas={[
                  { titulo: "Produto", valor: (r) => r.nome },
                  { titulo: "Sem venda", valor: (r) => `${r.diasSemVenda} dias`, direita: true },
                  { titulo: "Valor", valor: (r) => brl(r.valor), direita: true },
                ]} />
              </Card>
            </Bento>
          )}
          {aba === "abc" && (
            <Bento>
              <Card span={12} titulo="Curva ABC do período">
                <DataTable linhas={s.curva} limite={12} colunas={[
                  { titulo: "Produto", valor: (r) => r.nome },
                  { titulo: "Receita", valor: (r) => brl(r.receita), direita: true },
                  { titulo: "Margem", valor: (r) => pct(r.margem), direita: true },
                  { titulo: "Acumulado", valor: (r) => <span className="acum"><span className="acum-trilho"><i style={{ width: `${r.acumulado * 100}%` }} /></span>{pct(r.acumulado)}</span>, direita: true },
                  { titulo: "Classe", valor: (r) => <span className={`classe classe-${r.classe}`}>{r.classe}</span>, direita: true },
                ]} />
              </Card>
            </Bento>
          )}
          {aba === "estoque" && (
            <Bento>
              <Card span={8} titulo="Estoque por produto">
                <DataTable linhas={[...s.itens].sort((x, y) => y.valor - x.valor)} colunas={[
                  { titulo: "Produto", valor: (r) => r.nome },
                  { titulo: "Unidades", valor: (r) => num(r.qtd), direita: true },
                  { titulo: "Valor", valor: (r) => brl(r.valor), direita: true },
                  { titulo: "Cobertura", valor: (r) => (r.cobertura === null ? "—" : dias(r.cobertura)), direita: true },
                ]} />
              </Card>
              <Card span={4} titulo="Por depósito"><BarList itens={s.depositos} /></Card>
            </Bento>
          )}
        </div>
      </div>
    </>
  );
}
