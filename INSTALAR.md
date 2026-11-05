# Instalar o BMB Dashboard — guia para o Claude

> **Claude: se alguém colou o link deste repositório e pediu para instalar o dashboard, siga este arquivo do começo ao fim.**
> Ele funciona sozinho, mesmo que o comando `/instalar-empresa` não esteja carregado.

## Como se comportar
- Fale em português do Brasil, com frases curtas e sem jargão. A pessoa provavelmente não é técnica.
- Faça você mesmo todos os comandos. Peça à pessoa só o que exige o login dela numa plataforma.
- **Nunca peça para colar senhas ou chaves no chat.** Você cria o arquivo `sync/.env` com espaços para preencher,
  diz qual linha preencher e onde achar o valor; ela edita o arquivo; você confere se foi preenchido sem exibir o valor.
- Um passo por vez. Depois de cada etapa, diga o que foi feito e o que vem a seguir.
- Se algo falhar, explique em uma frase o que aconteceu e o que fazer. Não siga adiante com uma etapa quebrada.

---

## Etapa 1 — Conferir o computador e entender a empresa
1. Se ainda não tem o repositório na máquina, clone o link que a pessoa colou numa pasta de trabalho.
   Se o clone falhar com "not found" ou "permission denied": o modelo é privado e a conta GitHub dela ainda não tem acesso.
   Diga para pedir acesso à BMB pelo e-mail **tools@bigmondobrands.com**, informando o usuário do GitHub dela, e pare aqui.
2. Rode `node scripts/verificar.mjs` e resolva cada ✗ com a pessoa (Node.js 20+, Git, GitHub CLI com `gh auth login`).
3. Pergunte, numa mensagem só:
   - nome da empresa;
   - e-mail de quem será o administrador do dashboard;
   - quais destes sistemas a empresa usa: **Shopify** (loja virtual), **Bling** (ERP), **Meta Ads**, **Google Ads**, **Google Analytics 4**.
4. Diga com clareza o que o dashboard vai mostrar com esses sistemas:
   - Bling → Overview, Performance B2B (se vender para empresas), Supply Chain e Finance;
   - Shopify e/ou marketplaces no Bling → Performance DTC;
   - Meta / Google Ads → mídia, ROAS e CAC; GA4 → tráfego e funil do site.
   - Se a empresa **não usa Bling nem Shopify** (outro ERP), avise que hoje o dashboard não tem conector para ele:
     só mídia e tráfego funcionariam. Pergunte se quer seguir assim e registre o pedido do conector em `docs/INSTALACAO.md`.

## Etapa 2 — Criar a cópia da empresa
O modelo (`dashboard-model`) nunca recebe dados nem chaves. A empresa ganha uma cópia própria.
1. Defina o nome: `dashboard-<empresa>` em minúsculas, sem acentos, com hífens (ex.: `dashboard-fibras-brasil`).
2. Crie a cópia privada a partir do modelo, na conta (ou organização) GitHub da pessoa, e entre nela:
   `gh repo create <conta>/dashboard-<empresa> --private --template <dono-do-modelo>/dashboard-model --clone`
   e depois trabalhe **dentro da pasta da cópia** daqui em diante.
3. Se já estiver dentro de uma cópia (o nome não é `dashboard-model`), pule esta etapa.

## Etapa 3 — Entregar o passo a passo das contas
Monte **uma única mensagem** com a lista abaixo, só com os itens que se aplicam aos sistemas da empresa.
Peça para a pessoa ir fazendo e avisar quando terminar cada bloco. Todas as contas são gratuitas e devem usar o e-mail da empresa.

> **Para instalar o dashboard da <empresa>, você vai precisar de:**
>
> **1. Supabase (banco de dados)** — crie a conta em https://supabase.com e um projeto novo (região *South America (São Paulo)*).
> Guarde a senha do banco que ele pedir.
>
> **2. Cloudflare (site)** — crie a conta em https://dash.cloudflare.com/sign-up. É onde o dashboard fica no ar.
>
> **3. Shopify** — acesso de proprietário ou colaborador com permissão de apps na loja, e conta em https://dev.shopify.com.
>
> **4. Bling** — usuário administrador da conta.
>
> **5. Meta Ads** — crie a conta em https://windsor.ai, conecte o Facebook Ads e escolha a conta de anúncios da empresa.
>
> **6. Google Ads** — acesso de administrador à conta de anúncios.
>
> **7. Google Analytics 4** — acesso de administrador à propriedade e uma conta em https://console.cloud.google.com.
>
> Eu te guio em cada um quando chegarmos lá. Pode começar pelo Supabase e me avise quando o projeto estiver criado.

## Etapa 4 — Banco (Supabase)
1. `cd sync && npm ci` e `cd ../app && npm ci`.
2. Crie `sync/.env` a partir de `sync/.env.exemplo`, já com um `CLIENTE_SALT` aleatório
   (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).
3. Peça para preencher no `sync/.env`, com os valores do Supabase:
   - `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`: Project Settings → API (Project URL e a chave `service_role`);
   - `DATABASE_URL`: botão **Connect** no topo do projeto → *Session pooler* → copiar a URI e trocar `[YOUR-PASSWORD]` pela senha do banco.
4. `cd sync && npm run banco:aplicar`
5. Pergunte a alíquota média de impostos (ex.: 9,2% no Simples) e o saldo de caixa no início do histórico (pode ser 0). Depois:
   `npm run banco:configurar -- --empresa="<Nome>" --admin=<email do administrador> --aliquota=<0.092> --saldo=<valor>`
   Guarde o **token do Google Ads** que aparece no fim (etapa 5.4). Ele não aparece de novo.
6. Crie `app/.env` a partir de `app/.env.exemplo`. A `VITE_SUPABASE_URL` é a mesma URL do projeto; peça para preencher
   `VITE_SUPABASE_ANON_KEY` com a chave `anon` (Project Settings → API). Essa chave é pública.

## Etapa 5 — Fontes (uma por vez; pule as que a empresa não usa)

### 5.1 Shopify
1. Guie no https://dev.shopify.com → Apps → **Create app**:
   - Redirect URL: `http://localhost:8787/retorno`
   - Escopos (só leitura): `read_orders`, `read_products`, `read_fulfillments`
   - Dados protegidos de clientes: pedir **só o identificador do cliente** (nenhum nome, e-mail ou endereço)
   - Distribuição: **Custom distribution**, com o domínio `<loja>.myshopify.com`
2. Peça para preencher `SHOPIFY_LOJA`, `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET` no `sync/.env`.
3. Autorize:
   - Claude Code no computador da pessoa: `npm run autorizar -- shopify` → ela abre o link e clica em **Install**.
   - Chat na nuvem: `npm run autorizar -- shopify --link` → ela clica em **Install** → o navegador mostra um erro em localhost
     (esperado) → ela cola no chat o **endereço** dessa página (não é senha) → `npm run autorizar -- shopify --url="<endereço>"`.

### 5.2 Bling
1. Guie no Bling → Central de Extensões → Área do integrador → **Criar aplicativo**:
   - Link de redirecionamento: `http://localhost:8787/retorno`
   - Escopos de leitura: pedidos de venda, produtos, estoques, depósitos, contas a pagar, contas a receber, categorias, vendedores, canais de venda.
2. Peça para preencher `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET`. Autorize como na Shopify (`npm run autorizar -- bling`).
3. **VALIDAR**: confira com a conta real os pontos marcados `VALIDAR` em `sync/src/conectores/bling.ts`
   (custo do produto, situação de cancelado e de pago, canais de venda). Ajuste na cópia e anote em `docs/INSTALACAO.md`.

### 5.3 Meta Ads (Windsor)
1. Na conta Windsor: conectar Facebook Ads, escolher **uma** conta de anúncios, copiar a API key (menu da conta).
2. Peça para preencher `WINDSOR_API_KEY`. Confira os nomes dos campos de gasto, receita e compras (atribuição de 1 dia após
   o clique). Se diferirem do padrão, grave `WINDSOR_CAMPOS` (ordem: data, campanha, gasto, receita, compras).

### 5.4 Google Ads
1. Gere o script a partir de `google-ads-script/sync.js`, já com `SUPABASE_URL`, a chave `anon` e o token da etapa 4.5.
   Mostre o texto completo para a pessoa copiar (a chave `anon` é pública; o token só serve para gravar mídia).
2. Ela cola em Google Ads → Ferramentas → Ações em massa → **Scripts** → **+**, autoriza, clica em **Visualizar**
   (deve aparecer "Enviadas N linhas") e agenda **Diariamente, 5h–6h**.

### 5.5 Google Analytics 4
1. Guie no https://console.cloud.google.com: criar projeto → ativar **Google Analytics Data API** →
   IAM → Contas de serviço → criar → Chaves → **Adicionar chave JSON** (baixa um arquivo).
2. Peça para colar o conteúdo do arquivo, em uma linha, em `GA4_SERVICE_ACCOUNT_JSON` no `sync/.env`,
   e o número da propriedade (GA4 → Administrador → Detalhes da propriedade) em `GA4_PROPERTY_ID`.
3. No GA4 → Administrador → Gerenciamento de acesso à propriedade → **+** → o e-mail da conta de serviço
   (`client_email` do JSON; você pode ler e mostrar esse e-mail) → papel **Leitor**.

## Etapa 6 — Conferir os números
- `cd sync && npm run testar-fontes` (últimos 3 dias, sem gravar).
- Mostre o resultado e peça para comparar com o painel de cada plataforma (diferença aceitável: até 1%).
  A receita do site vem da Shopify (pedidos pagos); a do Bling é dos demais canais.

## Etapa 7 — Histórico, lojas e metas
1. Carga dos últimos 12 meses nesta máquina (não no GitHub, para não gastar os minutos gratuitos), em segundo plano:
   `npm run sync -- --desde=<hoje − 365 dias>`. O Bling é lento (3 requisições/s): pode levar horas. Siga as outras etapas enquanto roda.
2. **Lojas do Bling**: leia a tabela `lojas_canais` e sugira a classificação pelo nome
   (loja virtual/Shopify → `site` com `espelha_site = true`; Mercado Livre, Shopee, Amazon, Magalu → `marketplace`;
   atacado, representante, B2B → `b2b`). Confirme **loja por loja** com a pessoa antes de gravar.
3. **Despesas fixas**: mostre as categorias do financeiro do Bling e confirme quais são fixas (folha, aluguel, sistemas…).
   Atualize `config.categorias_fixas`. A DRE e o EBITDA dependem disso.
4. Metas: dá para cadastrar depois, na tela **Metas** do dashboard.

## Etapa 8 — Colocar no ar
1. `cd app && npm run build` (usa o `app/.env`).
2. Publique no Cloudflare Pages:
   - **Claude Code no computador:** `npx wrangler@3.99.0 login` (a pessoa autoriza no navegador), depois
     `npx wrangler@3.99.0 pages project create dashboard-<empresa> --production-branch=main` e
     `npx wrangler@3.99.0 pages deploy dist --project-name=dashboard-<empresa>`. O endereço `https://dashboard-<empresa>.pages.dev` aparece no fim.
   - **Chat na nuvem:** guie a pessoa no Cloudflare → Workers & Pages → Create → Pages → **Connect to Git** → a cópia da empresa.
     Root directory `app`, build command `npm ci && npm run build`, output `dist`, e as variáveis
     `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. No Supabase → Authentication → URL Configuration: **Site URL** = o endereço do site; adicione o mesmo em **Redirect URLs**.

## Etapa 9 — Ligar o robô
1. `cd sync && npm run segredos:enviar` (manda as chaves do `.env` para os secrets do GitHub da cópia e liga o robô).
2. `gh workflow run "Sincronizar dados"` e acompanhe com `gh run watch`. Se falhar, leia o log e corrija antes de seguir.
3. O robô roda às 6h (completo) e às 12h, 16h e 20h (vendas). Quando falha, o GitHub manda e-mail para o dono do repositório.

## Etapa 10 — Entregar
1. Peça para a pessoa abrir o endereço do site, entrar com o e-mail do administrador e clicar no link que chega por e-mail.
   Confirme com ela que os números apareceram.
2. Para liberar outras pessoas: inclua o e-mail e o perfil na tabela `usuarios_perfis`
   (admin, gestor, marketing, financeiro, leitura) e peça para cada uma entrar pelo site.
3. Escreva `docs/INSTALACAO.md` na cópia (data, fontes conectadas, ajustes feitos, pendências), faça commit e push.
4. Termine com uma mensagem curta:

> **O dashboard da <empresa> está no ar:** https://dashboard-<empresa>.pages.dev
> Entre com <e-mail do administrador> (o acesso chega por e-mail, sem senha).
> Fontes conectadas: …. Atualiza às 6h, 12h, 16h e 20h.
> Pendências: … (se houver).
