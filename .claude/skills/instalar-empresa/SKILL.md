---
name: instalar-empresa
description: Instala o BMB Dashboard para uma empresa nova (ou reinstala). Use quando o usuário disser "instalar empresa", "/instalar-empresa", "configurar o dashboard para a empresa X" ou "conectar as fontes". Conduz o passo a passo, roda os comandos e confere cada fonte.
---

# Instalar o BMB Dashboard numa empresa

Você conduz a instalação conversando com o usuário, **um passo por vez**, em português simples.
Faça você mesmo tudo o que for comando; peça ao usuário só o que exige login dele numa plataforma.
Nunca peça senhas no chat. Chaves e segredos vão direto para o `.env` local e para os secrets do GitHub,
e nunca entram em arquivos versionados.

Leia antes: `docs/DECISOES.md`, `docs/KPIS.md` e `docs/PLANO.md`.

## 0. Conferir o ponto de partida
- Este repositório deve ser a cópia da empresa (criada com "Use this template" a partir de `dashboard-model`).
  Se o nome do repositório for `dashboard-model`, **pare**: explique que a instalação vai numa cópia
  (`github.com/<dono>/dashboard-model/generate` → `dashboard-<empresa>`, privado) e que a cópia precisa ser liberada
  para o app do Claude no GitHub. Não grave chaves nem configuração no modelo.
- Rode `cd sync && npm ci` e `cd app && npm ci`.
- Pergunte: nome da empresa, e-mail do primeiro administrador, quais fontes ela usa (Shopify, Bling, Meta, Google Ads, GA4).

## 1. Banco (Supabase)
1. Peça ao usuário para criar uma conta gratuita no Supabase **com o e-mail da empresa** e um projeto
   (região São Paulo). Ele te passa: Project URL, `anon` key, `service_role` key e a connection string (modo *Session*).
2. Grave em `sync/.env` (a partir de `sync/.env.exemplo`): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`,
   e um `CLIENTE_SALT` aleatório (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).
3. `cd sync && npm run banco:aplicar`
4. Pergunte a alíquota média de impostos (ex.: 0,092 no Simples) e o saldo de caixa no início do histórico. Depois:
   `npm run banco:configurar -- --empresa="<Nome>" --admin=<email> --aliquota=<x> --saldo=<y>`
   Guarde o **token do Google Ads** que o comando imprime (passo 2.4). Ele não aparece de novo.
5. No Supabase → Authentication → URL Configuration: o Site URL será o endereço do site (passo 5). Volte aqui depois.

## 2. Fontes (uma por vez; pule as que a empresa não usa)

### 2.1 Shopify (app personalizado)
1. Guie o usuário no **Dev Dashboard** da Shopify (dev.shopify.com) → Apps → Criar app:
   - URL de redirecionamento: `http://localhost:8787/retorno`
   - Escopos (somente leitura): `read_orders`, `read_products`, `read_fulfillments`
   - Dados protegidos de clientes: pedir acesso **apenas ao identificador do cliente** (sem nome, e-mail, endereço)
   - Distribuição: **personalizada**, com o domínio `<loja>.myshopify.com`
2. Grave `SHOPIFY_LOJA`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` no `sync/.env`.
3. Autorizar (o token fica no banco):
   - **No computador do usuário:** `npm run autorizar -- shopify` → ele abre o link e clica em **Instalar**.
   - **Em chat na nuvem:** `npm run autorizar -- shopify --link` → ele abre o link e clica em **Instalar**; o navegador
     mostra uma página de erro em localhost (esperado) → ele cola no chat o endereço dessa página →
     `npm run autorizar -- shopify --url="<endereço colado>"`.

### 2.2 Bling (app privado)
1. Guie o usuário no Bling → Central de Extensões → Área do integrador → **Criar aplicativo** (privado):
   - Link de redirecionamento: `http://localhost:8787/retorno`
   - Escopos de leitura: pedidos de venda, produtos, estoques, depósitos, contas a pagar, contas a receber,
     categorias, vendedores, canais de venda.
2. Grave `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET`. Autorize como na Shopify (`npm run autorizar -- bling`, ou `--link` e depois `--url=` em chat na nuvem).
3. ⚠️ VALIDAR com a conta real os campos marcados `VALIDAR` em `sync/src/conectores/bling.ts`
   (custo do produto, situação de cancelado, situação de pago, endpoint de canais). Ajuste o código se preciso.

### 2.3 Meta Ads (Windsor free)
1. O usuário cria uma conta gratuita no Windsor.ai **com o e-mail da empresa**, conecta o Facebook Ads e seleciona
   **uma** conta de anúncios. Depois copia a API key.
2. Grave `WINDSOR_API_KEY`. Confira os nomes dos campos de gasto, receita e compras no Windsor
   (atribuição de 1 dia após o clique). Se diferirem do padrão, grave `WINDSOR_CAMPOS` (ordem: data, campanha, gasto, receita, compras).

### 2.4 Google Ads (script na conta da empresa)
1. Gere o script preenchido a partir de `google-ads-script/sync.js` com `SUPABASE_URL`, a `anon` key e o token do passo 1.4.
   Entregue o texto completo para o usuário copiar.
2. Ele cola em Google Ads → Ferramentas → Ações em massa → Scripts → **+**, autoriza, clica em **Visualizar**
   (deve aparecer "Enviadas N linhas") e agenda **Diariamente, 5h–6h**.

### 2.5 GA4
1. Confirme o e-mail da conta de serviço da holding (`client_email` do JSON em `GA4_SERVICE_ACCOUNT_JSON`).
   Se a holding ainda não tem: Google Cloud → novo projeto → ativar "Google Analytics Data API" → conta de serviço → chave JSON.
2. O usuário vai em GA4 → Administrador → Gerenciamento de acesso à propriedade → **+** → esse e-mail → papel **Leitor**.
3. Grave `GA4_PROPERTY_ID` (número em Administrador → Detalhes da propriedade) e `GA4_SERVICE_ACCOUNT_JSON` (em uma linha).

## 3. Conferir as fontes
- `npm run testar-fontes` puxa os últimos 3 dias de cada fonte, sem gravar.
- Mostre o resultado e peça para o usuário comparar com o painel de cada plataforma (diferença aceitável ≤ 1%).
  Lembre: a receita do site vem da Shopify (pedidos pagos); a do Bling é dos demais canais.

## 4. Histórico, classificação e metas
1. Carga dos últimos 12 meses **nesta sessão** (não no GitHub Actions, para não gastar os minutos gratuitos). Rode em segundo plano:
   `npm run sync -- --desde=<hoje − 365 dias>`. O Bling é lento (3 requisições/s): avise que pode levar horas.
2. **Classificar as lojas do Bling**: leia `lojas_canais` e sugira pela regra do nome
   (Shopify/site/loja virtual → `site` + `espelha_site=true`; Mercado Livre/Shopee/Amazon/Magalu → `marketplace`;
   atacado/representante/B2B → `b2b`). Confirme **loja por loja** com o usuário e grave. Nunca adivinhe sem confirmar.
3. Metas: ofereça importar de uma planilha ou deixar para a tela de Metas do dashboard.
4. Categorias de despesas fixas: mostre as categorias do financeiro do Bling e confirme quais são fixas
   (atualize `config.categorias_fixas`). DRE e EBITDA dependem disso.

## 5. Publicar o site (Cloudflare Pages)
1. O usuário (ou a holding) entra no Cloudflare → Workers & Pages → Criar → Pages → **Conectar ao Git** → este repositório.
   - Diretório raiz: `app` · Comando de build: `npm ci && npm run build` · Saída: `dist`
   - Variáveis: `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
2. Com o endereço do site em mãos, volte ao Supabase → Authentication → URL Configuration e grave o Site URL e o Redirect URL.
3. Cadastre os usuários em `usuarios_perfis` (e-mail + perfil: admin, gestor, marketing, financeiro, leitura).

## 6. Ligar o robô (GitHub Actions)
Grave os secrets com `gh secret set <NOME>` (um por variável do `sync/.env`, exceto `DATABASE_URL`) e depois
`gh variable set SYNC_ATIVO --body true`. Dispare uma execução manual (`gh workflow run "Sincronizar dados"`) e confira o log.
Alertas: o GitHub envia e-mail quando uma execução falha. Confirme que a conta que recebe os e-mails é tools@bigmondobrands.com.

## 7. Entregar
Resuma para o usuário: link do site, quem tem acesso, fontes conectadas e o que ficou pendente (ex.: aprovação de dados
protegidos na Shopify, metas a cadastrar). Registre a instalação em `docs/INSTALACAO.md` desta cópia.
