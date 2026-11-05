# BMB Dashboard

Dashboard de gestão das empresas da BMB: **Overview, Performance DTC, Performance B2B, Supply Chain e Finance**,
com dados da Shopify, Bling, Meta Ads (Windsor), Google Ads e GA4. Custo zero por empresa.

## Ver funcionando
`cd app && npm install && npm run dev` → http://localhost:5173 (dados simulados de uma empresa exemplo).

## Instalar numa empresa
Abra o **Claude Code**, cole o link deste repositório e peça: *"Instale o dashboard para a minha empresa."*

O Claude confere o computador, cria a cópia `dashboard-<empresa>`, te passa a lista de contas para criar (todas gratuitas),
conecta as fontes, confere os números, coloca o site no ar e entrega o link de acesso. O roteiro está em [`INSTALAR.md`](INSTALAR.md).

> **Claude:** se pediram para instalar, siga `INSTALAR.md`.

## Estrutura
| Pasta | O que é |
|---|---|
| `app/` | Site do dashboard |
| `sync/` | Robô de sincronização e scripts de instalação |
| `google-ads-script/` | Script para a conta Google Ads da empresa |
| `supabase/` | Tabelas, permissões e testes |
| `design-system/` | Sistema visual |
| `docs/` | Decisões, KPIs e plano |
