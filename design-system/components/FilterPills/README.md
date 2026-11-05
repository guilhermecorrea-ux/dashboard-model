# FilterPills

Fileira de pílulas que escolhe o período, a comparação e o recorte da face inteira.

**O consumidor fornece:** as opções e qual está ativa (`aria-pressed="true"`). Cada fileira é um grupo com `aria-label`.

- Uma pílula ativa por fileira, preenchida com `brand` e texto `on-brand`.
- A pílula de comparação ("vs. mês anterior", "vs. ano anterior") tem borda tracejada e abre uma lista.
- O filtro vale para todos os painéis da face. Nunca coloque filtros dentro de um painel isolado.
- Ordem fixa: período, comparação, recorte (Tudo, Site, Marketplaces, B2B).
