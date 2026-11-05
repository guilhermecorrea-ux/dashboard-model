-- BMB Dashboard — formato padrão de dados, permissões e entrada do Google Ads.
-- Roda no Supabase da empresa (SQL Editor ou `npm run banco:aplicar`). Idempotente.

-- ---------------------------------------------------------------- Configuração da empresa
create table if not exists public.config (
  chave text primary key,
  valor jsonb not null
);

create table if not exists public.usuarios_perfis (
  email text primary key check (email = lower(email)),
  perfil text not null check (perfil in ('admin', 'gestor', 'marketing', 'financeiro', 'leitura')),
  criado_em timestamptz not null default now()
);

create table if not exists public.lojas_canais (
  id text primary key,                     -- id da loja no Bling
  nome text not null,
  classe text not null default 'nao_classificada'
    check (classe in ('site', 'marketplace', 'b2b', 'nao_classificada')),
  espelha_site boolean not null default false, -- loja do Bling que espelha o site (excluída da receita)
  atualizado_em timestamptz not null default now()
);

create table if not exists public.metas (
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  area text not null check (area in ('DTC', 'B2B')),
  valor numeric(14, 2) not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (ano, mes, area)
);

-- ---------------------------------------------------------------- Dados das fontes
create table if not exists public.produtos (
  sku text primary key,
  nome text not null,
  custo numeric(14, 4) not null default 0,
  preco numeric(14, 2) not null default 0,
  categoria text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.pedidos (
  id text primary key,                     -- "<fonte>:<id na origem>"
  fonte text not null check (fonte in ('shopify', 'bling')),
  loja_id text not null,                   -- 'shopify' para o site; id da loja no Bling para os demais
  data date not null,
  uf char(2),
  cliente_id text,                         -- identificador anônimo (hash); sem dados pessoais
  cliente_nome text,                       -- só B2B (razão social)
  valor_bruto numeric(14, 2) not null default 0,
  desconto numeric(14, 2) not null default 0,
  frete numeric(14, 2) not null default 0,
  reembolso numeric(14, 2) not null default 0,
  cupom text,
  origem text,                             -- UTM source (site)
  dias_preparacao numeric(8, 2),
  vendedor text,
  prazo_recebimento_dias int,
  status text,
  atualizado_em timestamptz not null default now()
);
create index if not exists pedidos_data_idx on public.pedidos (data);
create index if not exists pedidos_cliente_idx on public.pedidos (cliente_id);

create table if not exists public.itens_pedido (
  pedido_id text not null references public.pedidos (id) on delete cascade,
  linha int not null,
  sku text not null,
  qtd numeric(14, 3) not null,
  preco_unit numeric(14, 4) not null,
  primary key (pedido_id, linha)
);

create table if not exists public.estoque (
  sku text not null,
  deposito text not null,
  quantidade numeric(14, 3) not null default 0,
  ultima_venda date,
  atualizado_em timestamptz not null default now(),
  primary key (sku, deposito)
);

create table if not exists public.financeiro (
  id text primary key,                     -- "bling:<tipo>:<id>"
  tipo text not null check (tipo in ('pagar', 'receber')),
  categoria text not null default 'Sem categoria',
  descricao text,
  valor numeric(14, 2) not null,
  vencimento date not null,
  pago_em date,
  fixa boolean not null default false,
  atualizado_em timestamptz not null default now()
);
create index if not exists financeiro_venc_idx on public.financeiro (vencimento);

create table if not exists public.notas_fiscais (
  id text primary key,
  data date not null,
  valor numeric(14, 2) not null default 0,
  impostos numeric(14, 2) not null default 0,
  pedido_id text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.midia_diaria (
  data date not null,
  plataforma text not null check (plataforma in ('meta', 'google_ads')),
  campanha text not null,
  investimento numeric(14, 2) not null default 0,
  receita_atribuida numeric(14, 2) not null default 0,
  conversoes numeric(14, 2) not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (data, plataforma, campanha)
);

create table if not exists public.trafego_diario (
  data date not null,
  origem text not null,
  dispositivo text not null,
  sessoes int not null default 0,
  carrinho int not null default 0,
  checkout int not null default 0,
  compras int not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (data, origem, dispositivo)
);

create table if not exists public.sync_log (
  id bigserial primary key,
  fonte text not null,
  modo text not null,
  inicio timestamptz not null default now(),
  fim timestamptz,
  ok boolean,
  linhas int,
  dados_ate date,
  erro text
);

-- ---------------------------------------------------------------- Área privada (só o robô)
create schema if not exists privado;
revoke all on schema privado from public;

-- Chaves e tokens que se renovam (Bling, Shopify). Nunca expostos ao site.
create table if not exists privado.credenciais (
  fonte text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Token do script do Google Ads (guardado como hash).
create table if not exists privado.tokens_entrada (
  nome text primary key,
  hash text not null
);

-- ---------------------------------------------------------------- Permissões
create or replace function public.meu_perfil() returns text
language sql stable security definer set search_path = public as $$
  select perfil from public.usuarios_perfis
  where email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
revoke all on function public.meu_perfil() from public;
grant execute on function public.meu_perfil() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['config','usuarios_perfis','lojas_canais','metas','produtos','pedidos','itens_pedido',
                           'estoque','financeiro','notas_fiscais','midia_diaria','trafego_diario','sync_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- Leitura: qualquer usuário cadastrado vê os dados de vendas, mídia, tráfego e estoque.
do $$
declare t text;
begin
  foreach t in array array['config','lojas_canais','metas','produtos','pedidos','itens_pedido','estoque',
                           'notas_fiscais','midia_diaria','trafego_diario','sync_log'] loop
    execute format('drop policy if exists ler on public.%I', t);
    execute format('create policy ler on public.%I for select to authenticated using (public.meu_perfil() is not null)', t);
  end loop;
end $$;

-- Financeiro (contas a pagar e a receber): só admin, gestor e financeiro.
drop policy if exists ler on public.financeiro;
create policy ler on public.financeiro for select to authenticated
  using (public.meu_perfil() in ('admin', 'gestor', 'financeiro'));

-- Usuários: cada um vê o próprio perfil; admin vê e gerencia todos.
drop policy if exists ler on public.usuarios_perfis;
create policy ler on public.usuarios_perfis for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or public.meu_perfil() = 'admin');
drop policy if exists gerenciar on public.usuarios_perfis;
create policy gerenciar on public.usuarios_perfis for all to authenticated
  using (public.meu_perfil() = 'admin') with check (public.meu_perfil() = 'admin');
grant insert, update, delete on public.usuarios_perfis to authenticated;

-- Metas: admin e gestor editam.
drop policy if exists editar on public.metas;
create policy editar on public.metas for all to authenticated
  using (public.meu_perfil() in ('admin', 'gestor')) with check (public.meu_perfil() in ('admin', 'gestor'));
grant insert, update, delete on public.metas to authenticated;

-- Classificação das lojas: só admin.
drop policy if exists editar on public.lojas_canais;
create policy editar on public.lojas_canais for update to authenticated
  using (public.meu_perfil() = 'admin') with check (public.meu_perfil() = 'admin');
grant update (classe, espelha_site, atualizado_em) on public.lojas_canais to authenticated;

-- ---------------------------------------------------------------- Entrada do Google Ads Script
-- O script roda dentro da conta Google Ads e chama esta função com um token próprio,
-- sem precisar da chave de administrador do banco.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.receber_google_ads(p_token text, p_linhas jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if not exists (select 1 from privado.tokens_entrada
                 where nome = 'google_ads' and hash = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'token inválido' using errcode = '28000';
  end if;
  insert into public.midia_diaria (data, plataforma, campanha, investimento, receita_atribuida, conversoes, atualizado_em)
  select (l ->> 'data')::date, 'google_ads', l ->> 'campanha',
         coalesce((l ->> 'investimento')::numeric, 0), coalesce((l ->> 'receita')::numeric, 0),
         coalesce((l ->> 'conversoes')::numeric, 0), now()
  from jsonb_array_elements(p_linhas) l
  on conflict (data, plataforma, campanha) do update
    set investimento = excluded.investimento, receita_atribuida = excluded.receita_atribuida,
        conversoes = excluded.conversoes, atualizado_em = now();
  get diagnostics n = row_count;
  insert into public.sync_log (fonte, modo, fim, ok, linhas, dados_ate)
    values ('google_ads', 'script', now(), true, n, (select max((l ->> 'data')::date) from jsonb_array_elements(p_linhas) l));
  return n;
end $$;
revoke all on function public.receber_google_ads(text, jsonb) from public;
grant execute on function public.receber_google_ads(text, jsonb) to anon, authenticated;

-- Define (ou troca) o token do Google Ads. Uso: select public.definir_token_google_ads('<token>');
create or replace function public.definir_token_google_ads(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  insert into privado.tokens_entrada (nome, hash) values ('google_ads', encode(extensions.digest(p_token, 'sha256'), 'hex'))
  on conflict (nome) do update set hash = excluded.hash
$$;
revoke all on function public.definir_token_google_ads(text) from public, anon, authenticated;
