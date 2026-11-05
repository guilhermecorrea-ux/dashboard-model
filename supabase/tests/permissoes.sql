-- Testes de permissão: cada perfil só lê o que pode. Falha com exceção se algo vazar.
grant all on all tables in schema public to service_role;
insert into public.usuarios_perfis values ('admin@x.com','admin', now()), ('mkt@x.com','marketing', now()), ('fin@x.com','financeiro', now())
  on conflict do nothing;
insert into public.pedidos (id, fonte, loja_id, data, valor_bruto) values ('shopify:1','shopify','shopify','2026-11-01',100) on conflict do nothing;
insert into public.financeiro (id, tipo, valor, vencimento) values ('bling:pagar:1','pagar',50,'2026-11-10') on conflict do nothing;
select public.definir_token_google_ads('segredo-teste');

create or replace function pg_temp.como(email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('email', email)::text, true);
end $$;

do $$
declare n int;
begin
  set local role authenticated;
  -- marketing: vê pedidos, não vê financeiro, não edita metas
  perform pg_temp.como('mkt@x.com');
  select count(*) into n from public.pedidos; if n <> 1 then raise exception 'marketing deveria ver pedidos'; end if;
  select count(*) into n from public.financeiro; if n <> 0 then raise exception 'marketing NÃO deveria ver financeiro'; end if;
  begin
    insert into public.metas values (2026, 1, 'DTC', 1000, now());
    raise exception 'marketing NÃO deveria editar metas';
  exception when insufficient_privilege then null; end;
  -- financeiro: vê financeiro
  perform pg_temp.como('fin@x.com');
  select count(*) into n from public.financeiro; if n <> 1 then raise exception 'financeiro deveria ver financeiro'; end if;
  -- desconhecido: não vê nada
  perform pg_temp.como('estranho@x.com');
  select count(*) into n from public.pedidos; if n <> 0 then raise exception 'usuário sem perfil NÃO deveria ver pedidos'; end if;
  -- admin: edita metas e vê todos os usuários
  perform pg_temp.como('admin@x.com');
  insert into public.metas values (2026, 1, 'DTC', 1000, now()) on conflict (ano, mes, area) do update set valor = 1000;
  select count(*) into n from public.usuarios_perfis; if n < 3 then raise exception 'admin deveria ver todos os usuários'; end if;
  reset role;
end $$;

-- anon não lê nada e não acessa a área privada
do $$
declare n int;
begin
  set local role anon;
  begin perform 1 from public.pedidos; raise exception 'anon NÃO deveria ler pedidos';
  exception when insufficient_privilege then null; end;
  begin perform 1 from privado.credenciais; raise exception 'anon NÃO deveria ler credenciais';
  exception when insufficient_privilege then null; end;
  -- script do Google Ads: token certo grava, token errado é recusado
  select public.receber_google_ads('segredo-teste', '[{"data":"2026-11-03","campanha":"PMax","investimento":10.5,"receita":40,"conversoes":2}]') into n;
  if n <> 1 then raise exception 'Google Ads deveria gravar 1 linha'; end if;
  begin perform public.receber_google_ads('errado', '[]'); raise exception 'token errado deveria falhar';
  exception when sqlstate '28000' then null; end;
  reset role;
end $$;
select 'PERMISSOES_OK' as resultado;
