# DonutChart

Anel que mostra como um total se divide entre partes, com o total no centro e a legenda ao lado.

**O consumidor fornece:** as partes (nome e valor), já ordenadas da maior para a menor, e o rótulo do total.

- Até 5 partes, nas cores `chart-1` a `chart-5`, sempre na mesma ordem. Mais que isso: agrupe o resto em "Outros", em `ink-muted`.
- Cada canal mantém a mesma cor em todas as faces (Site sempre `chart-1`).
- A legenda traz valor em reais e percentual. O anel nunca aparece sem ela.
- Use só para composição de um total. Para comparar períodos, use BarChart.
