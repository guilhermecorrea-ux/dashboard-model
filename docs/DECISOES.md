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
| Meta Ads | **Windsor.ai plano Free — uma conta Windsor nova por empresa** (1 fonte + 1 conta cobre o Meta de uma empresa) | Nenhuma |
| Shopee / Amazon / TikTok Shop | App da holding | Cadastro de parceiro, uma vez — fase posterior |

### Shopify via app personalizado (decidido)

- Sem conector pago: **app de permissão** + **nosso conector** (robô).
- App criado no **Dev Dashboard** da Shopify (desde 01/2026 não se cria mais
  app direto no admin da loja) com **distribuição personalizada**.
- Distribuição personalizada = 1 app por loja. Para cada empresa nova, a
  holding cria uma cópia do app ligada à loja e gera o link de instalação
  (~5 min, guiado pelo `/instalar-empresa`). Dono da loja: 1 clique (Instalar).
- Escopos só de leitura: pedidos, produtos, estoque. **Sem dados pessoais de
  clientes** (evita pedido de "protected customer data" e reduz exposição LGPD).
- Futuro: com muitas lojas de fora, migrar para app público não listado
  (revisão única da Shopify) e qualquer loja instala sozinha.
- Tokens que expiram são renovados automaticamente pelo robô.

### Meta Ads via Windsor Free (decidido)

- Cada empresa que entrar cria **sua própria conta Windsor (free)**, com o
  e-mail da empresa, conectando só o Meta Ads.
- Limite: 1 conta de anúncios por empresa. Se uma empresa tiver 2+ contas de
  anúncio Meta, a alternativa gratuita é o app próprio da holding com "usuário
  de sistema" (sem App Review para contas do próprio Business Manager).
- O conector "Windsor → formato padrão" é um só, reutilizado por todas as
  empresas; muda apenas a chave de API de cada uma.
- Risco: Windsor mudar os limites do plano free. Mitigação: painel lê só o
  formato padrão, então a troca para app próprio não mexe no painel.

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
