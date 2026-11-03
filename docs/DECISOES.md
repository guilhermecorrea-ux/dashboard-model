# Decisões de arquitetura — dashboard-model

Registro das decisões tomadas antes do plano de execução. Serve de base para o
desenho do fluxo de dados (artefato) e para as fases de construção.

## Objetivo

Dashboard-modelo com várias "faces", replicável para qualquer empresa (do grupo
ou de fora): copiar o repositório, rodar a instalação com o Claude e estar
pronto. Instalação o mais próximo possível de **1 clique**. Meta: **custo zero**.

## Decisão 1 — Como os dados chegam ✅ FECHADA

**Conectores próprios, sem agregadores pagos (Windsor.ai, Supermetrics etc.).**

- Windsor descartado por custo (US$ 19–499/mês). Planos free de agregadores
  (Windsor, Porter, Dataslayer, Coupler) são limitados demais (1 fonte / 1–3
  contas / 30 dias / 100 linhas).
- **Modelo 2 — apps centrais da holding:** um app por plataforma, registrado
  uma única vez em nome da holding. A empresa (do grupo ou de fora) só clica em
  "Autorizar" (OAuth). Mantém o 1 clique para terceiros.
- Peça central: "porteiro de autorização" (recebe o retorno do OAuth e entrega
  o token ao banco da empresa). Gratuito — Cloudflare Workers ou Web App do
  Apps Script.
- Dados de cada empresa ficam separados (banco próprio por empresa).
- Base de código: aproveitar conectores open source (dlt / Singer) quando
  existirem; escrever próprios para o que não existe (ex.: Mercado Livre, Bling).
- O painel lê **somente o formato padrão de dados** — nunca a fonte direto.
  Trocar a origem de uma fonte não mexe no painel.

### Mapa de fontes

| Fonte | Como entra | Aprovação externa |
|---|---|---|
| Google Ads | **Google Ads Scripts na MCC da holding** (dispensa developer token). Empresa de fora só aceita o vínculo com a MCC | Nenhuma |
| GA4 | Apps Script (serviço nativo do Analytics) ou API Google | Nenhuma |
| Shopify | App da holding, link de instalação direto (sem App Store) | Nenhuma |
| Mercado Livre | App da holding (OAuth) | Nenhuma |
| Bling / Olist | App da holding (OAuth) | Nenhuma |
| Meta Ads | App da holding | Verificação do Business + App Review, uma vez |
| Shopee / Amazon / TikTok Shop | App da holding | Cadastro de parceiro, uma vez — fase posterior |

### Pontos de atenção registrados

- Vercel Hobby (free) **proíbe uso comercial** → hospedar o site em
  Cloudflare Pages (free, permite uso comercial).
- Meta e Google versionam APIs e desligam versões antigas ~anualmente →
  prever manutenção dos conectores.
- Lidar com dados de terceiros exige política de privacidade e termos de uso
  (a Meta exige no App Review).
- Apps Script: limite de 6 min por execução e cota diária → não usar como robô
  principal; Google Sheets não serve como banco principal (lento, 10M células).

## Decisão 2 — Dados ao vivo ou banco com sincronização ⏳ PENDENTE

Recomendação em discussão: sincronização diária (GitHub Actions free) para
banco Supabase (free, 500 MB/projeto); site em Cloudflare Pages.

## Decisão 3 — Quem acessa (login/permissões) ⏳ PENDENTE

## Decisão 4 — Dashboard por empresa e/ou visão consolidada (holding) ⏳ PENDENTE

## Decisão 5 — Fontes da primeira versão ⏳ PENDENTE

Sugestão inicial: Shopify, Meta Ads, Google Ads, Mercado Livre.
