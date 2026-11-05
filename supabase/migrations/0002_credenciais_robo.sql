-- Acesso do robô às credenciais que se renovam (área privada), só com a chave service_role.
create or replace function public.ler_credencial(p_fonte text) returns jsonb
language sql stable security definer set search_path = privado as $$
  select dados from privado.credenciais where fonte = p_fonte
$$;
create or replace function public.gravar_credencial(p_fonte text, p_dados jsonb) returns void
language sql security definer set search_path = privado as $$
  insert into privado.credenciais (fonte, dados, atualizado_em) values (p_fonte, p_dados, now())
  on conflict (fonte) do update set dados = excluded.dados, atualizado_em = now()
$$;
revoke all on function public.ler_credencial(text) from public, anon, authenticated;
revoke all on function public.gravar_credencial(text, jsonb) from public, anon, authenticated;
grant execute on function public.ler_credencial(text) to service_role;
grant execute on function public.gravar_credencial(text, jsonb) to service_role;
