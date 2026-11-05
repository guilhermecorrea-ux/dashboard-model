# FacePage

Layout padrão de toda face do dashboard, mostrado com a Overview: trilho à esquerda, cabeçalho com nome e filtros, aviso de atualização, faixa de destaque e painéis.

**O consumidor fornece:** o nome da face, o nome da empresa, os filtros e os painéis na ordem de leitura.

- Ordem fixa, de cima para baixo: cabeçalho (empresa em `label`, nome da face em `page-title`, FilterPills à direita), AlertBanner de atualização, PlanVsActual do faturamento, faixa de KpiCards, painéis.
- Margem da página `space-8`, gap entre blocos `space-6`, gap entre painéis `space-5`.
- Grade de painéis em 12 colunas no desktop. Painéis largos (séries no tempo) ocupam 7 colunas e os de apoio 5. No celular, tudo vira uma coluna.
- Cada face abre com o resumo e depois o detalhe: o número que responde "como estamos?" sempre vem antes do gráfico que explica.
