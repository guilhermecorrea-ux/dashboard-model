# BMB Dashboard

Dashboard de gestão das empresas da BMB: **Overview, Performance DTC, Performance B2B, Supply Chain e Finance**,
com dados da Shopify, Bling, Meta Ads (Windsor), Google Ads e GA4. Custo zero por empresa.

## Ver funcionando
`cd app && npm install && npm run dev` → http://localhost:5173 (dados simulados da Vitanuts).

## Instalar numa empresa
1. No GitHub: **Use this template** → repositório privado `dashboard-<empresa>` na organização da BMB.
2. Abra o Claude nessa cópia e rode **`/instalar-empresa`**. Ele conduz banco, fontes, conferência, publicação e o robô.

## Estrutura
| Pasta | O que é |
|---|---|
| `app/` | Site do dashboard |
| `sync/` | Robô de sincronização e scripts de instalação |
| `google-ads-script/` | Script para a conta Google Ads da empresa |
| `supabase/` | Tabelas, permissões e testes |
| `design-system/` | Sistema visual |
| `docs/` | Decisões, KPIs e plano |
