# PlanVsActual

Barra que mostra o realizado contra o planejado do período, com a projeção de fechamento no ritmo atual.

**O consumidor fornece:** realizado, planejado (da tela de Metas), projeção e o rótulo do período.

- Todo faturamento no dashboard aparece neste formato: total, por área (DTC, B2B) e por canal.
- Realizado em `brand` sólido, projeção em hachura `violet` e meta como marcador vertical `lime`.
- A escala da barra vai até 125% da meta, para mostrar quando ela é superada. O marcador fica em 80% da largura.
- Sem meta cadastrada, mostre o realizado sozinho e o aviso "Meta não cadastrada · Cadastrar", que leva à tela de Metas.
- O percentual atingido sempre acompanha os valores em reais, nunca aparece sozinho.
