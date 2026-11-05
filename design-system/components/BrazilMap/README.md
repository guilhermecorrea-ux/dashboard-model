# BrazilMap

Mapa do Brasil por estado, colorido pela receita do período, com o ranking dos 5 maiores ao lado.

**O consumidor fornece:** a receita por UF de entrega (site pela Shopify, demais canais pelo Bling) e o período.

- 5 faixas: `map-0` (sem venda) e `map-1` a `map-4`, divididas em quartis da receita do período. A legenda de escala fica sempre visível.
- Sigla da UF dentro do estado: `ink` sobre `map-1` e `map-2`, `on-map-3` sobre `map-3`, `on-brand` sobre `map-4`.
- Ao passar o mouse: balão com estado, receita, % do total e pedidos.
- O ranking ao lado mostra os 5 estados com maior receita e o % do total.
- Na implementação, use o mapa geográfico do ECharts com os mesmos tokens. Esta prévia usa um cartograma em blocos (um bloco por UF) só para fixar cores e legenda.
- Só a UF de entrega é usada. Nenhum dado pessoal de cliente aparece no mapa.
