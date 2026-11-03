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
| Google Ads | **Google Ads Script instalado na conta Google Ads de cada empresa** (dispensa developer token; sem vínculo com MCC da holding). ~5 min, guiado | Nenhuma |
| GA4 | Apps Script (serviço nativo do Analytics) ou API Google | Nenhuma |
| Shopify | App da holding, link de instalação direto (sem App Store) | Nenhuma |
| Mercado Livre | App da holding (OAuth) | Nenhuma |
| Bling | **App privado criado na conta Bling de cada empresa** (caminho A) | Nenhuma |
| Olist / Tiny | App da holding (OAuth) — a definir | Nenhuma |
| Meta Ads | **Windsor.ai plano Free — uma conta Windsor nova por empresa** (1 fonte + 1 conta cobre o Meta de uma empresa) | Nenhuma |
| Shopee / Amazon / TikTok Shop | App da holding | Cadastro de parceiro, uma vez — fase posterior |

### Google Ads via Script na conta da empresa (decidido)

- Substitui a ideia inicial de script na MCC da holding.
- Script colado na conta Google Ads da empresa, autorizado e agendado
  (madrugada; aceita horário). Envia direto ao Supabase da empresa.
- Cada script conhece só o banco da própria empresa → isolamento total, sem
  tabela "conta → banco" e sem a empresa se vincular à holding.
- Requer acesso de administrador à conta Google Ads na instalação.
- Atualização do script é feita conta por conta (rara; guiada pelo Claude).

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

### Bling via app privado por empresa (decidido — caminho A)

- Em cada empresa, cria-se um **app privado** na conta Bling dela (API v3,
  OAuth 2.0). Sem homologação, funciona no mesmo dia. ~5 min por empresa,
  guiado pelo `/instalar-empresa`. Requer acesso de administrador ao Bling.
- App público com homologação (1 clique para terceiros) **não** será feito
  agora; fica como evolução futura se houver muitas empresas de fora.
- Mesmo conector para qualquer origem de autorização.
- Dados puxados: pedidos de venda (todos os canais), produtos com custo,
  estoque por depósito, notas fiscais, contas a pagar/receber.
  → base da face **Financeiro / Margem**.
- A confirmar na construção: regras atuais do app privado no portal do Bling
  (documentação pública encontrada está desatualizada).
- Tokens expiram; o robô renova automaticamente.

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

## Decisão 2 — Armazenamento e frequência ✅ FECHADA

- **Banco com sincronização** (não consulta ao vivo). Painel lê só do banco.
- **Supabase free** (500 MB), **uma conta Supabase própria por empresa**
  (o plano free permite só 2 projetos por conta → cada empresa tem a sua,
  como no Windsor). Dados totalmente isolados.
- Robô de sincronização no **GitHub Actions** (free, 2.000 min/mês em
  repositório privado). Site em **Cloudflare Pages**.
- **Frequência — meio-termo:**
  - Madrugada: sincronização completa de todas as fontes (D-1, com
    reprocessamento dos últimos dias para pegar ajustes/devoluções).
  - 12h, 16h e 20h: atualização rápida só de **vendas do dia** (Shopify,
    Bling).
- Observação: Meta via Windsor free atualiza 1x/dia → mídia Meta fica em D-1.
  Google Ads Scripts aceita agendamento horário se precisar.

## Decisão 3 — Quem acessa ✅ FECHADA (opção B)

- **Holding + equipe de cada empresa**, com permissões por empresa e por face.
- Login pelo **Supabase Auth** (free, até 50 mil usuários): e-mail com link
  mágico, sem senha. Sem custo adicional.
- Perfis propostos (ajustáveis):

| Perfil | Empresas | Faces |
|---|---|---|
| Admin holding | Cada empresa (login em cada dashboard) | Todas + instalação/configuração |
| Gestor da empresa | A sua | Todas |
| Marketing | A sua | Visão geral + Marketing |
| Financeiro | A sua | Visão geral + Vendas + Financeiro/Margem + Estoque |
| Leitura | A sua | Visão geral |

- Regras de acesso aplicadas no banco (Row Level Security do Supabase), não
  só na tela.

## Decisão 4 — Dashboard por empresa ✅ FECHADA (opção A)

- **Somente um dashboard por empresa.** Sem visão consolidada da holding.
- Cada empresa = 1 cópia do repositório + 1 conta Supabase + 1 site
  (Cloudflare Pages) + seu próprio robô (GitHub Actions — cada repositório
  tem sua própria cota free de 2.000 min/mês).
- Isolamento total e custo zero por empresa; serve igual para empresas de fora.
- Para ver o grupo, abre-se empresa por empresa. Uma tela consolidada pode ser
  adicionada no futuro (lendo só totais diários de cada empresa) sem refazer
  nada.

## Decisão 5 — Escopo da primeira versão ✅ FECHADA (fontes)

**Fontes da v1:**

| Fonte | Via |
|---|---|
| Shopify | App personalizado por loja |
| Bling | App privado por empresa |
| Meta Ads | Windsor free (conta por empresa) |
| Google Ads | Google Ads Script na conta de cada empresa |
| GA4 | Apps Script / API Google |

- **Marketplaces (Mercado Livre, Shopee, Amazon, TikTok Shop) ficam fora por
  enquanto.** A receita deles entra **somente via Bling** (pedidos de todos os
  canais registrados no Bling), sem tarifas, anúncios ou métricas próprias dos
  marketplaces.
- **Faces: ainda não definidas.** A definição das faces será uma tarefa
  dentro do plano de execução.
