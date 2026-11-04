# KpiCard

Cartão com um KPI: rótulo, valor, variação e uma linha de contexto, com minigráfico opcional da tendência.

**O consumidor fornece:** rótulo, valor já formatado, DeltaChip (valor e se é bom ou ruim), linha de contexto (meta ou valor da comparação) e, se quiser, a série do minigráfico.

- Rótulo no estilo `label` (caixa alta) e valor em `kpi-lg` com algarismos tabulares.
- Linha de contexto em `body-sm` e `ink-muted`. Quando houver meta, ela aparece em `lime`.
- Faixa de destaque: no máximo 6 cartões por linha no desktop, 2 no celular.
- Formatos: moeda "R$ 812 mil", "R$ 1,24 mi"; múltiplo "4,8×"; percentual "31,6%"; diferença de percentuais em "p.p.".
- O cartão nunca tem cor de fundo própria. Destaque vem do DeltaChip e da meta.
