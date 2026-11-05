# Instalar o BMB Dashboard — guia para o Claude

> **Claude: se alguém colou o link deste repositório e pediu para instalar o dashboard, siga este arquivo do começo ao fim.**
> Ele funciona sozinho, mesmo que o comando `/instalar-empresa` não esteja carregado.

## ⛔ Requisito: só no app do Claude para computador

A instalação **só pode ser feita no Claude Code dentro do app Claude para computador (Mac ou Windows)**.
É o único lugar que tem, juntos: comandos no computador da pessoa, o **navegador do próprio Claude** e o retorno das
autorizações (localhost).

**Como conferir:** você precisa ter as ferramentas do navegador do app (`mcp__Claude_Browser__*`) e conseguir rodar
comandos no computador da pessoa. Se faltar qualquer uma das duas (Claude Code no terminal, no navegador web, numa sessão
na nuvem ou no celular), **pare antes de qualquer outra etapa** e responda só isto:

> Para instalar o dashboard, abra o **app Claude para computador** (download em https://claude.ai/download),
> entre em **Claude Code**, escolha uma pasta de trabalho no seu computador e cole o link de novo com o mesmo pedido.
> Lá eu consigo configurar as plataformas por você no navegador do próprio app.

## Como se comportar
- Português do Brasil, frases curtas, sem jargão. A pessoa provavelmente não é técnica.
- **Você executa; a pessoa só faz login e confirma.** Ordem de preferência para cada configuração:
  1. **Ferramenta oficial no terminal** (GitHub CLI, Supabase CLI, Wrangler da Cloudflare): ela autoriza uma vez no navegador e você faz o resto.
  2. **Navegador do app** (Bling, Windsor, Shopify, Supabase, Google): você navega, clica e preenche.
  3. **Passo guiado**, só quando os dois acima não funcionarem (ex.: o Google bloquear o login no navegador do app).
- **Login é sempre da pessoa.** Abra a página de login no navegador do app e peça para ela entrar. Nunca digite senhas,
  códigos de verificação ou respostas de segurança, nem peça para colá-los no chat.
- **Antes de criar ou salvar algo numa plataforma**, diga em uma linha o que vai fazer e espere o "pode seguir".
- **Chaves e segredos**: copie da página direto para o `sync/.env` ou `app/.env`. Não repita os valores no chat.
- Um passo por vez. Depois de cada etapa, diga o que foi feito e o que vem a seguir.
- Se algo falhar, explique em uma frase o que aconteceu e o que fazer. Não siga adiante com uma etapa quebrada.

---

## Etapa 1 — Conferir o computador e entender a empresa
1. Clone o link que a pessoa colou numa pasta de trabalho (o modelo é público; não precisa de login).
2. Rode `node scripts/verificar.mjs` e resolva cada ✗ com a pessoa: Node.js 20+, Git e GitHub CLI
   (`gh auth login` → GitHub.com → HTTPS → *Login with a web browser*; ela autoriza no navegador).
3. Pergunte, numa mensagem só:
   - nome da empresa;
   - e-mail de quem será o administrador do dashboard;
   - quais destes sistemas a empresa usa: **Shopify** (loja virtual), **Bling** (ERP), **Meta Ads**, **Google Ads**, **Google Analytics 4**.
4. Diga o que o dashboard vai mostrar com esses sistemas:
   - Bling → Overview, Performance B2B (se vender para empresas), Supply Chain e Finance;
   - Shopify e/ou marketplaces no Bling → Performance DTC;
   - Meta / Google Ads → mídia, ROAS e CAC; GA4 → tráfego e funil do site.
   - Se a empresa **não usa Bling nem Shopify** (outro ERP), avise que hoje não há conector para ele: só mídia e tráfego
     funcionariam. Pergunte se quer seguir assim e registre o pedido do conector em `docs/INSTALACAO.md`.

## Etapa 2 — Criar a cópia da empresa
O modelo (`dashboard-model`) nunca recebe dados nem chaves. A empresa ganha uma cópia própria, privada.
1. Nome: `dashboard-<empresa>`, minúsculas, sem acentos, com hífens (ex.: `dashboard-fibras-brasil`).
2. `gh repo create <conta>/dashboard-<empresa> --private --template <dono-do-modelo>/dashboard-model --clone`
   e trabalhe **dentro da pasta da cópia** daqui em diante.
3. Se já estiver numa cópia (o nome não é `dashboard-model`), pule esta etapa.

## Etapa 3 — Entregar a lista de contas
Monte **uma única mensagem**, só com os itens que se aplicam. Todas as contas são gratuitas e devem usar o e-mail da empresa.
Explique que ela só cria as contas e faz login; a configuração você faz.

> **Para instalar o dashboard da <empresa>, crie estas contas (todas gratuitas, com o e-mail da empresa):**
> 1. **Supabase** (banco de dados): https://supabase.com
> 2. **Cloudflare** (onde o site fica no ar): https://dash.cloudflare.com/sign-up
> 3. **Windsor.ai** (para o Meta Ads): https://windsor.ai *(só se usa Meta Ads)*
> 4. **Google Cloud** (para o GA4): https://console.cloud.google.com *(só se usa GA4; pode ser o mesmo login Google da empresa)*
>
> Você também vai precisar estar com acesso de **administrador** em: Shopify, Bling, Google Ads e GA4 (os que a empresa usa).
>
> Quando terminar, me avise. Daí em diante eu configuro tudo; você só vai fazer login quando eu pedir e confirmar o que eu for salvar.

## Etapa 4 — Banco (Supabase)
1. `cd sync && npm ci` e `cd ../app && npm ci`. Crie `sync/.env` a partir de `sync/.env.exemplo` com um `CLIENTE_SALT`
   aleatório (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).
2. `npx supabase login` → a pessoa autoriza no navegador.
3. Gere uma senha forte para o banco (não mostre no chat) e crie o projeto:
   `npx supabase projects create dashboard-<empresa> --region sa-east-1 --db-password <senha> --org-id <org>`
   (`npx supabase orgs list` mostra a organização). Pegue as chaves com `npx supabase projects api-keys --project-ref <ref>`.
4. Grave no `sync/.env`: `SUPABASE_URL=https://<ref>.supabase.co`, `SUPABASE_SERVICE_KEY` (chave `service_role`) e
   `DATABASE_URL`. A connection string do *Session pooler* fica no botão **Connect** do projeto: abra no navegador do app,
   copie e troque `[YOUR-PASSWORD]` pela senha gerada.
5. `cd sync && npm run banco:aplicar`
6. Pergunte a alíquota média de impostos (ex.: 9,2% no Simples) e o saldo de caixa no início do histórico (pode ser 0):
   `npm run banco:configurar -- --empresa="<Nome>" --admin=<email do administrador> --aliquota=<0.092> --saldo=<valor>`
   Guarde o **token do Google Ads** que aparece no fim (etapa 5.4). Ele não aparece de novo.
7. Crie `app/.env` a partir de `app/.env.exemplo` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave `anon`, pública).

## Etapa 5 — Fontes (uma por vez; pule as que a empresa não usa)

### 5.1 Shopify
1. No navegador do app, abra https://dev.shopify.com e peça para ela entrar. Crie o app:
   - Redirect URL: `http://localhost:8787/retorno`
   - Escopos (só leitura): `read_orders`, `read_products`, `read_fulfillments`
   - Dados protegidos de clientes: pedir **só o identificador do cliente** (nenhum nome, e-mail ou endereço)
   - Distribuição: **Custom distribution**, com o domínio `<loja>.myshopify.com`
2. Copie `SHOPIFY_LOJA`, `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET` para o `sync/.env`.
3. `npm run autorizar -- shopify --link`, abra o link no navegador do app e peça para ela clicar em **Install**.
   O navegador vai para `localhost:8787/retorno?...` (pode mostrar erro; é esperado): pegue esse endereço da barra e rode
   `npm run autorizar -- shopify --url="<endereço>"`. (Sem `--link`, o comando espera o retorno sozinho em localhost.)

### 5.2 Bling
1. No navegador do app, abra o Bling e peça para ela entrar. Vá em Central de Extensões → Área do integrador →
   **Criar aplicativo**:
   - Link de redirecionamento: `http://localhost:8787/retorno`
   - Escopos de leitura: pedidos de venda, produtos, estoques, depósitos, contas a pagar, contas a receber, categorias,
     vendedores, canais de venda.
2. Copie `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET` para o `sync/.env` e autorize como na Shopify (`npm run autorizar -- bling --link`).
3. **VALIDAR**: confira com a conta real os pontos marcados `VALIDAR` em `sync/src/conectores/bling.ts`
   (custo do produto, situação de cancelado e de pago, canais de venda). Ajuste na cópia e anote em `docs/INSTALACAO.md`.

### 5.3 Meta Ads (Windsor)
1. No navegador do app, abra https://onboard.windsor.ai e peça para ela entrar. Conecte o **Facebook Ads**
   (o login do Facebook é dela; pode pedir confirmação no celular) e escolha **uma** conta de anúncios.
2. Copie a API key da conta para `WINDSOR_API_KEY`. Confira na tela de campos do Windsor os nomes de gasto, receita e
   compras (atribuição de 1 dia após o clique). Se diferirem do padrão, grave `WINDSOR_CAMPOS`
   (ordem: data, campanha, gasto, receita, compras).

### 5.4 Google Ads
1. Gere o script a partir de `google-ads-script/sync.js`, já com `SUPABASE_URL`, a chave `anon` e o token da etapa 4.6.
2. No navegador do app, abra o Google Ads e peça para ela entrar. Vá em Ferramentas → Ações em massa → **Scripts** → **+**,
   cole o script, peça para ela autorizar, clique em **Visualizar** (deve aparecer "Enviadas N linhas") e agende
   **Diariamente, 5h–6h**.
3. Se o Google recusar o login no navegador do app ("este navegador pode não ser seguro"), mostre o script completo e
   guie a pessoa para fazer os mesmos cliques no navegador dela.

### 5.5 Google Analytics 4
1. No navegador do app, abra https://console.cloud.google.com (login dela): criar projeto → ativar
   **Google Analytics Data API** → IAM → Contas de serviço → criar → Chaves → **Adicionar chave JSON**.
   Leia o arquivo baixado e grave o conteúdo, em uma linha, em `GA4_SERVICE_ACCOUNT_JSON`.
2. No GA4 → Administrador → Detalhes da propriedade: copie o número para `GA4_PROPERTY_ID`.
   Em Gerenciamento de acesso à propriedade → **+** → o e-mail da conta de serviço (`client_email`) → papel **Leitor**.
3. Se o Google recusar o login no navegador do app, guie a pessoa para fazer esses passos no navegador dela.

## Etapa 6 — Conferir os números
- `cd sync && npm run testar-fontes` (últimos 3 dias, sem gravar).
- Mostre o resultado e peça para comparar com o painel de cada plataforma (diferença aceitável: até 1%).
  A receita do site vem da Shopify (pedidos pagos); a do Bling é dos demais canais.

## Etapa 7 — Histórico, lojas e metas
1. Carga dos últimos 12 meses neste computador (não no GitHub, para não gastar os minutos gratuitos), em segundo plano:
   `npm run sync -- --desde=<hoje − 365 dias>`. O Bling é lento (3 requisições/s): pode levar horas.
   Siga as outras etapas enquanto roda e avise que o computador deve ficar ligado até terminar.
2. **Lojas do Bling**: leia a tabela `lojas_canais` e sugira a classificação pelo nome
   (loja virtual/Shopify → `site` com `espelha_site = true`; Mercado Livre, Shopee, Amazon, Magalu → `marketplace`;
   atacado, representante, B2B → `b2b`). Confirme **loja por loja** com a pessoa antes de gravar.
3. **Despesas fixas**: mostre as categorias do financeiro do Bling e confirme quais são fixas (folha, aluguel, sistemas…).
   Atualize `config.categorias_fixas`. A DRE e o EBITDA dependem disso.
4. Metas: dá para cadastrar depois, na tela **Metas** do dashboard.

## Etapa 8 — Colocar no ar
1. `cd app && npm run build` (usa o `app/.env`).
2. `npx wrangler@3.99.0 login` → a pessoa autoriza no navegador. Depois:
   `npx wrangler@3.99.0 pages project create dashboard-<empresa> --production-branch=main` e
   `npx wrangler@3.99.0 pages deploy dist --project-name=dashboard-<empresa>`.
   O endereço `https://dashboard-<empresa>.pages.dev` aparece no fim.
3. No Supabase (navegador do app) → Authentication → URL Configuration: **Site URL** = o endereço do site;
   adicione o mesmo em **Redirect URLs**. Confirme com a pessoa antes de salvar.

## Etapa 9 — Ligar o robô
1. `cd sync && npm run segredos:enviar` (manda as chaves do `.env` para os secrets do GitHub da cópia e liga o robô).
2. `gh workflow run "Sincronizar dados"` e acompanhe com `gh run watch`. Se falhar, leia o log e corrija antes de seguir.
3. O robô roda às 6h (completo) e às 12h, 16h e 20h (vendas). Quando falha, o GitHub manda e-mail para o dono do repositório.

## Etapa 10 — Entregar
1. Abra o site no navegador do app e peça para a pessoa entrar com o e-mail do administrador (o link de acesso chega
   por e-mail). Confirme com ela que os números apareceram.
2. Para liberar outras pessoas: inclua o e-mail e o perfil na tabela `usuarios_perfis`
   (admin, gestor, marketing, financeiro, leitura) e peça para cada uma entrar pelo site.
3. Escreva `docs/INSTALACAO.md` na cópia (data, fontes conectadas, ajustes feitos, pendências), faça commit e push.
4. Termine com uma mensagem curta:

> **O dashboard da <empresa> está no ar:** https://dashboard-<empresa>.pages.dev
> Entre com <e-mail do administrador> (o acesso chega por e-mail, sem senha).
> Fontes conectadas: …. Atualiza às 6h, 12h, 16h e 20h.
> Pendências: … (se houver).
