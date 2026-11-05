# DeltaChip

Pílula curta com a variação de um número em relação à comparação escolhida nos filtros.

**O consumidor fornece:** o valor da variação e se ela é boa ou ruim para aquele KPI.

- A cor diz se a variação é boa (`positive`) ou ruim (`negative`), não se subiu ou desceu. CAC que cai é bom: seta ▼ em `positive`.
- Sempre seta + sinal + número (▲ +12,4%), nunca só a cor.
- Números no padrão brasileiro: vírgula decimal, sinal de menos tipográfico (−).
- Sem comparação disponível (ex.: ano anterior antes de 12 meses de histórico), mostre "sem comparação" em `ink-muted`, nunca 0%.
