# AlertBanner

Faixa curta no topo da face que avisa sobre o estado dos dados: quando foram atualizados, o que precisa de ação e o que falhou.

**O consumidor fornece:** o tom (informação, atenção ou erro), a mensagem e, se houver, a ação.

- Informação (`surface-raised`, `ink-muted`): horário da última atualização, sempre visível, citando fontes com atraso (Meta Ads até ontem).
- Atenção (`warning-soft`, `warning`): algo pede ação, como uma loja do Bling não classificada ou uma meta não cadastrada.
- Erro (`negative-soft`, `negative`): uma sincronização falhou. Diga o que ficou desatualizado e até quando vão os números.
- Mensagens em frases curtas, sem pedido de desculpas e sem pontos de exclamação. A ação vem à direita como link ("Classificar", "Ver detalhes").
