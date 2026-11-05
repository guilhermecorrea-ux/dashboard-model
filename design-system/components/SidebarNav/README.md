# SidebarNav

Trilho vertical à esquerda que leva às faces do dashboard: Overview, DTC, B2B, Supply e Finance, e abaixo do separador Metas e Ajustes.

**O consumidor fornece:** a face atual (marcada com `aria-current="page"`) e a lista de itens que o perfil do usuário pode ver. Um perfil Marketing, por exemplo, não recebe Finance.

- Cada item tem ícone e rótulo curto visível, nunca só ícone.
- O item ativo é um círculo `ink` com o ícone em `ground`; os demais ficam em `ink-muted`.
- O selo do topo mostra a sigla da holding (BMB) em `brand` sobre `brand-soft`. O nome e o logo da empresa ficam no cabeçalho da página, não no trilho.
- No celular, o trilho vira uma barra fixa no rodapé com os 5 itens de face; Metas e Ajustes vão para o menu do cabeçalho.
