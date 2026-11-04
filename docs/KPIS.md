# Faces e KPIs — dashboard-model

Versão de trabalho, revisada com o feedback do Guilherme. ⚠️ = depende de dado
ainda não confirmado no fluxo.

## Regras gerais

- **Faturamento sempre planejado × realizado.** O planejado vem de uma **tela
  de Metas** (preenchimento manual por mês, por área/canal), que aceita também
  metas de **anos anteriores**. Tabela `metas` no banco.
- **ROAS de Mídia** = receita ÷ investimento em mídia (Meta + Google). Não é
  ROAS geral, pois não considera outros investimentos.
- CTR, CPC e CPM **não** entram no dashboard.

## 1. Overview — foco em receita e margem

- Faturamento planejado × realizado (total e por área DTC / B2B), com projeção
  de fechamento do mês
- Receita líquida, crescimento vs. mês anterior e vs. ano anterior
- Margem bruta (R$ e %) e margem de contribuição (R$ e %)
- **Mapa do Brasil** com receita por estado/região (UF de entrega do pedido,
  Bling — sem dados pessoais)
- ⚠️ EBITDA e caixa disponível (dependem do financeiro bem categorizado)

## 2. Performance DTC

**Destaque (topo):** Receita (planejado × realizado) · Gasto em mídia ·
ROAS de Mídia · Ticket médio · CAC · Taxa de recorrência

Detalhe:
- Receita por canal (site, marketplaces via Bling)
- Pedidos
- Clientes novos × recorrentes
- Desconto médio e uso de cupons
- Investimento e resultado por plataforma e campanha
- % de mídia sobre a receita
- Sessões por origem, taxa de conversão, funil, conversão por dispositivo (GA4)

## 3. Performance B2B

- Receita B2B planejado × realizado, por cliente
- Pedidos e ticket médio B2B
- Clientes ativos (90 dias), novos × perdidos
- Concentração de receita (top 5 / top 10)
- Frequência de compra e clientes em risco
- Receita por vendedor/representante
- Margem B2B
- Prazo médio de recebimento e inadimplência B2B

## 4. Supply Chain

- Estoque em valor e unidades (por produto e depósito)
- Cobertura de estoque (dias) e risco de ruptura
- % de ruptura
- Giro de estoque
- Estoque parado (60/90 dias)
- Curva ABC
- ⚠️ **Tempo médio de preparação** (pedido → despacho)

Removidos: compras em aberto, prazo médio do fornecedor, sugestão de compra,
tempo médio de chegada (exigiria dados da transportadora).

## 5. Finance

- ⚠️ DRE gerencial
- Fluxo de caixa previsto (30/60/90 dias)
- Contas a pagar e a receber (vencidas, a vencer)
- Ciclo de caixa
- Impostos sobre vendas
- ⚠️ Despesas por categoria
- Inadimplência
- ⚠️ Ponto de equilíbrio

## Pendências

- Regra para separar DTC × B2B no Bling
- Marketplaces entram em DTC? (sugestão: sim)
- Fonte da data de despacho para o tempo de preparação (NF ou postagem no Bling / fulfillment na Shopify)
