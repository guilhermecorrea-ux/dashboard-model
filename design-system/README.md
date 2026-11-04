Sistema visual do dashboard das empresas da BMB. Toda face (Overview, Performance DTC, Performance B2B, Supply Chain, Finance) e toda empresa instalada usam estes tokens e componentes, sem variação. A estética é escura e calma: fundo verde quase preto, painéis arredondados e números grandes, com o verde BMB marcando o que importa.

## Princípios

- **Resumo antes do detalhe.** Cada face abre com o número que responde "como estamos?" (PlanVsActual e KpiCards) e só depois traz os gráficos que explicam.
- **Planejado × realizado sempre.** Todo faturamento aparece contra a meta da tela de Metas, com a projeção do mês.
- **A cor tem significado.** `brand` = realizado e ação, `violet` = comparação e projeção, `lime` = meta. Fora disso, a interface é neutra.
- **Uma identidade para todas as empresas.** O visual é o da BMB. O que muda por empresa é só o nome e o logo no cabeçalho.

## Cores

Tema principal: **Escuro**. O tema **Claro** existe para impressão de tela e para quem preferir, com os mesmos papéis.

- Página em `ground`, painéis em `surface`, elementos internos em `surface-raised`, filetes em `line`.
- Texto em `ink`; rótulos, eixos e legendas em `ink-muted`. Os dois têm contraste de pelo menos 4,5:1 sobre `ground`, `surface` e `surface-raised` nos dois temas.
- `brand` (verde BMB) marca o realizado nos gráficos, o item ativo do menu, a pílula selecionada e os links. Texto sobre preenchimento `brand` usa `on-brand`, nunca branco fixo.
- `violet` só para comparação e projeção, quase sempre em hachura diagonal.
- `lime` só para meta (planejado): o marcador vertical do PlanVsActual e o traço nas barras.
- Variações usam `positive` e `negative` conforme o efeito no negócio, sempre com seta e sinal. Verde e laranja diferem também em claridade, e a seta garante a leitura para quem não distingue cores.
- `warning` só em avisos que pedem ação.
- Gráficos de composição usam `chart-1` a `chart-5`, na mesma ordem em todas as faces. Cada canal tem cor fixa: Site `chart-1`, Mercado Livre `chart-2`, Shopee `chart-3`, Amazon `chart-4`, B2B `chart-5`.
- O mapa usa a escala `map-0` a `map-4`.
- Foco de teclado: anel sólido `focus` de 2px com 2px de folga, que passa de 3:1 sobre todas as superfícies.

## Tipografia

Duas famílias do Google Fonts: **Outfit** para títulos e números, **Manrope** para texto.

- Nome da face em `page-title`. Um por tela.
- Valor principal do faturamento em `kpi-xl`, valores de KpiCard em `kpi-lg` e números secundários em `kpi-md`.
- Título de painel em `panel-title`.
- Texto e células de tabela em `body`, comparações e legendas em `body-sm`, rótulos de KPI e cabeçalhos de tabela em `label` (caixa alta), eixos e siglas em `caption`.
- Todo número usa algarismos tabulares (`font-variant-numeric: tabular-nums`), para as colunas alinharem.

## Números

Padrão brasileiro em todo o dashboard:

- Moeda abreviada: R$ 812 mil, R$ 1,24 mi. Valores exatos só em tabelas e balões: R$ 812.430,18.
- Vírgula decimal: 46,2%, 4,8×.
- Diferença entre percentuais em pontos percentuais: +1,4 p.p.
- Variação com seta, sinal e menos tipográfico: ▲ +12,4%, ▼ −3,1%.
- Sem dado de comparação: "sem comparação", nunca 0%.

## Textos

- Português do Brasil, frases curtas, em caixa de frase ("Receita por estado", não "Receita Por Estado").
- Nomes dos KPIs exatamente como definidos: Receita, Gasto em mídia, ROAS de Mídia, Ticket médio, CAC, Taxa de recorrência, Margem bruta, Margem de contribuição.
- Nomes das faces: Overview, Performance DTC, Performance B2B, Supply Chain, Finance.
- Avisos dizem o que aconteceu e o que fazer, sem pedir desculpas e sem ponto de exclamação: "1 loja nova no Bling ainda não classificada. Classificar".
- Sem emoji.

## Forma e espaço

- Cantos: `radius-lg` em painéis e cartões, `radius-md` em blocos internos e barras, `radius-sm` em chips e campos, `radius-pill` em filtros, variações e barras de progresso.
- Padding de painel `space-6`. Gap entre painéis `space-5` no desktop e `space-4` no celular. Margem da página `space-8`.
- Sombra só em Panel e KpiCard (`shadow-panel`) e no balão do gráfico (`shadow-tooltip`).
- Hachura diagonal (135°, traço de 3px a cada 7px) é a única textura do sistema e sempre significa projeção ou comparação.

## Layout de uma face

Siga o FacePage: trilho de navegação à esquerda; cabeçalho com a empresa em `label`, o nome da face em `page-title` e os FilterPills à direita; AlertBanner com o horário da atualização; PlanVsActual do faturamento; faixa de KpiCards; painéis em grade de 12 colunas. No celular, tudo vira uma coluna e o trilho vai para o rodapé.

## Iconografia

Ícones de linha, 20px, traço 1,8px, pontas arredondadas, na cor do texto. Os ícones das prévias foram desenhados para este sistema como referência de estilo. Na implementação, use a biblioteca **Lucide**, que segue o mesmo estilo, sempre com rótulo de texto visível ao lado ou abaixo.

## Marca

Ainda não há logo da BMB neste sistema. O selo do menu usa a sigla "BMB" em Outfit sobre `brand-soft`. Quando o logo oficial chegar, ele entra em `assets/Logos` e substitui o selo.

## Gráficos

Desenhe com Apache ECharts usando estes tokens: barras arredondadas (`radius-md`), grade tracejada em `line`, eixos em `caption` e `ink-muted`, legenda abaixo do gráfico. O mapa do Brasil usa o mapa geográfico do ECharts com a escala `map-0` a `map-4`.
