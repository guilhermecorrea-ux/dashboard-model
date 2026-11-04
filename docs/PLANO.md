# Plano de execução — dashboard-model

Base: `docs/DECISOES.md` (fontes, banco, acesso, escopo) e `docs/KPIS.md`
(faces, KPIs, regras de cálculo).

Legenda: 🤖 = Claude constrói · 👤 = ação de uma pessoa (login, autorização,
aprovação). Cada fase só começa quando a anterior cumpre o critério de pronto.

**Empresa piloto:** Vitanuts (confirmado; usa Shopify, Bling, Meta Ads, Google Ads e GA4).

---

## Escolhas técnicas

| Peça | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript em tudo (robô, site, script do Google Ads) | Uma linguagem só; o Google Ads Script já é JavaScript |
| Conectores | Escritos por nós, enxutos | São só 5 fontes com APIs simples; dispensa dlt/Singer (Python) |
| Banco | Supabase (Postgres) + Row Level Security | Decidido; permissões aplicadas no banco |
| Cálculo dos KPIs | Views SQL no banco | Uma fórmula só para cada KPI, testável, igual em todas as telas |
| Site | React + Vite, site estático no Cloudflare Pages | Gratuito, uso comercial permitido |
| Gráficos e mapa | Apache ECharts (tem mapa do Brasil por UF) | Gratuito, cobre todos os gráficos e o mapa |
| Robô | GitHub Actions agendado | Decidido; 2.000 min/mês grátis por repositório |
| Instalação | Skill do Claude `/instalar-empresa` no repositório | Decidido |

### Estrutura do repositório

```
app/                    site do dashboard (React)
sync/                   robô de sincronização
  connectors/shopify
  connectors/bling
  connectors/windsor-meta
  connectors/ga4
google-ads-script/      script colado na conta Google Ads
supabase/migrations/    tabelas, permissões e views de KPIs
.github/workflows/      agendamentos do robô
.claude/skills/instalar-empresa/
docs/
```

---

## Fase 0 — Fundação

| # | Tarefa | Quem |
|---|---|---|
| 0.1 | Estrutura do repositório, padrões de código, testes automáticos | 🤖 |
| 0.2 | Tabelas do formato padrão: `pedidos`, `itens_pedido`, `produtos`, `estoque`, `financeiro`, `notas_fiscais`, `midia_diaria`, `trafego_diario` | 🤖 |
| 0.3 | Tabelas de configuração: `metas`, `lojas_canais`, `perfis`, `usuarios_perfis`, `sync_log` | 🤖 |
| 0.4 | Regras de permissão por perfil (Admin, Gestor, Marketing, Financeiro, Leitura) no banco | 🤖 |
| 0.5 | Criar conta Supabase da empresa piloto (e-mail da empresa) | 👤 |
| 0.6 | Criar conta Cloudflare (Pages) | 👤 |
| 0.7 | Aplicar as tabelas no Supabase do piloto | 🤖 |

**Entregável:** banco do piloto criado, vazio, com permissões.
**Pronto quando:** testes provam que cada perfil só lê o que pode.

---

## Fase 1 — Conectores (dados reais do piloto)

| # | Tarefa | Quem |
|---|---|---|
| 1.1 | **Shopify:** criar app no Dev Dashboard (distribuição personalizada) e instalar na loja | 👤 guiado |
| 1.2 | Conector Shopify: pedidos pagos, itens, produtos, reembolsos, cupom/desconto/frete, UTM, cliente novo × recorrente, UF de entrega, data de despacho (fulfillment). Sem dados pessoais | 🤖 |
| 1.3 | **Bling:** criar app privado na conta Bling e autorizar | 👤 guiado |
| 1.4 | Conector Bling: OAuth com renovação automática, pedidos por loja/canal, itens, produtos com custo, estoque por depósito, notas fiscais, contas a pagar/receber, lista de lojas | 🤖 |
| 1.5 | Validar na prática as regras do app privado do Bling | 🤖 + 👤 |
| 1.6 | **Meta:** criar conta Windsor free e conectar a conta de anúncios | 👤 guiado |
| 1.7 | Conector Windsor → `midia_diaria` (atribuição 1 dia após o clique) | 🤖 |
| 1.8 | Google Ads Script: lê a conta e envia para `midia_diaria` | 🤖 |
| 1.9 | Colar o script na conta Google Ads, autorizar e agendar | 👤 guiado |
| 1.10 | **GA4:** dar acesso de leitor à conta de serviço | 👤 guiado |
| 1.11 | Conector GA4 → `trafego_diario` | 🤖 |
| 1.12 | Agendamentos: completo de madrugada (reprocessa últimos 7 dias) + vendas às 12h, 16h e 20h | 🤖 |
| 1.13 | Carga do histórico: **últimos 12 meses** (decidido). Ampliável depois sem retrabalho | 🤖 |
| 1.14 | Registro de cada execução em `sync_log` + alerta por e-mail quando falhar, enviado ao **e-mail da holding** (tools@bigmondobrands.com, configurável) | 🤖 |

**Entregável:** banco do piloto sendo atualizado sozinho pelas 5 fontes.
**Pronto quando:** 7 dias seguidos sem falha e, em 3 dias de amostra, os
números do banco batem com os painéis da Shopify, Bling, Meta, Google Ads e
GA4 (diferença ≤ 1%).

---

## Fase 2 — Camada de KPIs

| # | Tarefa | Quem |
|---|---|---|
| 2.1 | Views de receita: site (Shopify pagos) + demais canais (Bling), excluindo a loja do Bling que espelha o site | 🤖 |
| 2.2 | Views DTC: receita, gasto em mídia, ROAS de Mídia, ticket médio, CAC, taxa de recorrência, funil | 🤖 |
| 2.3 | Views B2B: clientes ativos, novos × perdidos, concentração, frequência, em risco, prazo de recebimento, inadimplência | 🤖 |
| 2.4 | Views Supply: estoque, cobertura, ruptura, giro, estoque parado, curva ABC, tempo médio de preparação | 🤖 |
| 2.5 | Views Finance: fluxo de caixa, a pagar/receber, ciclo de caixa, impostos, inadimplência; DRE e despesas se o financeiro estiver categorizado | 🤖 |
| 2.6 | Views Overview: planejado × realizado, projeção do mês, margens, receita por UF (Shopify para o site + Bling para os demais) | 🤖 |
| 2.7 | Conferir cada KPI contra um cálculo manual numa planilha | 🤖 + 👤 aprova |

**Entregável:** todos os KPIs do `docs/KPIS.md` calculados no banco.
**Pronto quando:** cada KPI bate com o cálculo manual aprovado.

---

## Fase 3 — Dashboard base

| # | Tarefa | Quem |
|---|---|---|
| 3.1 | Estrutura do site aplicando o sistema visual **BMB Dashboard** (`design-system/`): tema escuro principal + claro | 🤖 |
| 3.2 | Login por e-mail sem senha e menu conforme o perfil | 🤖 |
| 3.3 | Filtros de período e comparação (período anterior, ano anterior) | 🤖 |
| 3.4 | Tela de **Metas**: grade ano × mês × área, aceita anos anteriores | 🤖 |
| 3.5 | Tela de **Configuração**: classificação das lojas do Bling, usuários e perfis | 🤖 |
| 3.6 | Aviso de "dados atualizados às HH:MM" e de lojas não classificadas | 🤖 |
| 3.7 | Publicação no Cloudflare Pages | 🤖 + 👤 |

**Entregável:** site no ar com login, metas e configuração, sem as faces.
**Pronto quando:** um usuário de cada perfil entra e vê só o que deve.

---

## Fase 4 — Faces

| # | Tarefa | Quem |
|---|---|---|
| 4.1 | **Definição final das faces:** esboço de cada tela (ordem dos KPIs, gráficos, destaques) para aprovação | 🤖 propõe · 👤 aprova |
| 4.2 | Overview (com mapa do Brasil) | 🤖 |
| 4.3 | Performance DTC | 🤖 |
| 4.4 | Performance B2B | 🤖 |
| 4.5 | Supply Chain | 🤖 |
| 4.6 | Finance | 🤖 |
| 4.7 | Revisão com dados reais do piloto | 👤 |

**Entregável:** as 5 faces funcionando com dados reais.
**Pronto quando:** cada face aprovada por você.

---

## Fase 5 — Instalação `/instalar-empresa`

| # | Tarefa | Quem |
|---|---|---|
| 5.1 | Roteiro da skill: nome, logo e cores da empresa → fontes → autorizações guiadas → teste de cada fonte | 🤖 |
| 5.2 | Passo de classificação das lojas do Bling (lista, sugere, confirma loja por loja) | 🤖 |
| 5.3 | Passo de metas (inclusive anos anteriores) e usuários iniciais | 🤖 |
| 5.4 | Criação do banco, carga do histórico e publicação do site | 🤖 |
| 5.5 | Repositório marcado como template no GitHub ("Use this template") e README de instalação | 🤖 + 👤 |
| 5.6 | Guia de manutenção: o que fazer quando uma API mudar ou o robô alertar falha | 🤖 |

**Entregável:** instalar uma empresa nova é copiar o template e rodar
`/instalar-empresa`.
**Pronto quando:** a instalação do piloto é refeita do zero só pela skill.

---

## Fase 6 — Piloto e replicação

| # | Tarefa | Quem |
|---|---|---|
| 6.1 | Uso real pelo piloto durante 2 semanas; correções | 👤 + 🤖 |
| 6.2 | Instalar a 2ª empresa só pelo `/instalar-empresa`, medindo o tempo | 👤 + 🤖 |
| 6.3 | Ajustar o que travou na instalação | 🤖 |

**Pronto quando:** a 2ª empresa fica no ar em até 1 hora de trabalho humano,
sem nenhuma mudança no código.

---

## Pendências

- Finance (validar na fase 2): DRE e despesas por categoria dependem de o financeiro estar
  categorizado no Bling da empresa
