# Panel

Contêiner arredondado que abriga um gráfico, uma tabela ou um grupo de números, com título e ação opcional.

**O consumidor fornece:** título (estilo `panel-title`), conteúdo e, se houver, o link "Ver detalhes ›" para a visão aprofundada.

- Fundo `surface`, borda `line`, cantos `radius-lg`, sombra `shadow-panel` e padding `space-6`.
- Gap entre painéis: `space-5` no desktop e `space-4` no celular.
- Títulos dizem o que o painel mostra, em português e sem jargão ("Receita por estado", não "Geo breakdown").
- Nunca aninhe um Panel dentro de outro. Agrupamentos internos usam `surface-raised` com `radius-md`.
