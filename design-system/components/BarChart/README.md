# BarChart

Barras verticais arredondadas para séries no tempo (dia, semana, mês), com a meta de cada período e a projeção do período em curso.

**O consumidor fornece:** a série (período, realizado, planejado), a projeção do período atual e o período selecionado.

- Barras em `brand-soft`; a barra selecionada (ao passar o mouse ou clicar) em `brand`, com balão do valor (`shadow-tooltip`).
- Meta como traço `lime` atravessando a barra. Projeção do período em curso em hachura `violet` acima do realizado.
- Eixo Y com no máximo 5 marcas, em reais abreviados (R$ 250 mil). Linhas de grade tracejadas em `line`.
- Rótulos do eixo X no estilo `caption`: meses com 3 letras (Jun), dias como 04/11.
- Legenda sempre abaixo do gráfico, com as mesmas três chaves do PlanVsActual.
- Na implementação, desenhe com ECharts usando estes tokens. A prévia aqui é estática.
