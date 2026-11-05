# BMB Dashboard (dashboard-model)

> **Pediram para instalar o dashboard? Siga `INSTALAR.md`, na raiz.** Não instale dentro do `dashboard-model`: a instalação
> acontece numa cópia `dashboard-<empresa>` que o próprio guia cria.

Dashboard-modelo replicável para as empresas da BMB (holding) e, no futuro, empresas de fora.
Cada empresa = uma cópia deste repositório (template) + um Supabase próprio + site no Cloudflare Pages
+ robô no GitHub Actions. Meta: **custo zero** e instalação guiada pelo comando `/instalar-empresa`.

## Onde está cada coisa
- `docs/DECISOES.md` — decisões de arquitetura (fontes, banco, acesso, escopo). Leia antes de mudar algo estrutural.
- `docs/KPIS.md` — faces, KPIs e regras de cálculo. Fórmulas não mudam sem confirmação do usuário.
- `docs/PLANO.md` — fases e o que falta.
- `design-system/` — sistema visual (tokens.json é a fonte única das cores e tipos; bundle.css os componentes).
- `app/` — site (React + Vite + ECharts). `src/metrics/` tem todas as fórmulas; `src/data/` as origens (simulada e Supabase).
- `sync/` — robô de sincronização (Shopify, Bling, Meta via Windsor, GA4) + scripts de banco e autorização.
- `google-ads-script/` — script colado na conta Google Ads de cada empresa.
- `supabase/migrations/` — tabelas e permissões (RLS). `supabase/tests/` testa as permissões num Postgres local.
- `INSTALAR.md` — o passo a passo de instalação (o `/instalar-empresa` aponta para ele).
- `scripts/verificar.mjs` — confere o computador antes de instalar.

## Regras que valem sempre
- Português do Brasil em tudo que o usuário vê. Números no padrão BR (R$ 812 mil, 46,2%, +1,4 p.p.).
- Receita do **site = Shopify (pedidos pagos)**; demais canais = Bling. A loja do Bling que espelha o site é excluída.
- **ROAS de Mídia** = receita do site ÷ (Meta + Google). **CAC** = mídia ÷ clientes novos do site.
- Estoque oficial = Bling. DTC = site + marketplaces; B2B = vendas a empresas (classificação por loja do Bling).
- Sem dados pessoais de clientes: ids anonimizados; nome só de pessoa jurídica (B2B).
- Nada de segredos no código: `.env` local (ignorado pelo git) e secrets do GitHub.
- Visual: usar só os tokens/classes do `design-system/`. Respeitar `prefers-reduced-motion`.

## Comandos
- App: `cd app && npm run dev` (dados simulados sem `.env`) · `npm run build` · `npm run demo` (HTML único).
- Robô: `cd sync && npm test` · `npm run sync` · `npm run testar-fontes` · `npm run autorizar -- shopify|bling` (em chat na nuvem: `--link` e depois `--url="<endereço>"`).
- Banco: `npm run banco:aplicar` · `npm run banco:configurar -- --empresa=... --admin=...`.
- Secrets: `cd sync && npm run segredos:enviar` (do `.env` para o GitHub, sem mostrar valores).
- Teste de permissões: aplicar `supabase/tests/stub_supabase.sql`, as migrações e `supabase/tests/permissoes.sql` num Postgres 16.

## Estado atual
Fases 0, 1 (código), 3, 4 e 5 (roteiro) prontas; dashboard roda com dados simulados.
Falta validar os conectores com as contas reais da primeira empresa instalada (campos marcados `VALIDAR`) — ver `docs/PLANO.md`.
