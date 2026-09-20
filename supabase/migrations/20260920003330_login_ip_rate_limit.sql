-- ============================================================================
-- Rate limit de login por IP — complementa o bloqueio por CONTA já existente
-- (check_login_lockout/register_login_result, 3 erros -> 3 min, 6 erros ->
-- bloqueio manual). Aquele mecanismo só protege uma conta específica; não
-- impede um mesmo IP de tentar senhas contra MUITOS e-mails diferentes
-- (spray attack) nem repetir tentativas rapidamente contra e-mails que nem
-- existem. Limite: 20 tentativas falhas por IP em 15 min -> bloqueia esse IP
-- por 15 min, independente de qual e-mail foi tentado.
-- ============================================================================

create table public.login_ip_attempts (
  ip text primary key,
  attempt_count int not null default 0,
  window_start timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_ip_attempts enable row level security;
-- Sem policies: só as funções abaixo (security definer) leem/escrevem aqui.

create or replace function public.check_login_ip_rate_limit(p_ip text)
returns table (blocked boolean, retry_after timestamptz)
language sql stable security definer set search_path = public as $$
  select
    (blocked_until is not null and blocked_until > now()),
    blocked_until
  from public.login_ip_attempts
  where ip = p_ip
  limit 1;
$$;

revoke execute on function public.check_login_ip_rate_limit(text) from public;
grant execute on function public.check_login_ip_rate_limit(text) to anon, authenticated;

create or replace function public.register_login_ip_attempt(p_ip text, p_success boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  if p_success then
    delete from public.login_ip_attempts where ip = p_ip;
    return;
  end if;

  insert into public.login_ip_attempts (ip, attempt_count, window_start, updated_at)
  values (p_ip, 1, now(), now())
  on conflict (ip) do update set
    -- Janela deslizante de 15 min: se a última já expirou, reinicia a
    -- contagem em vez de acumular tentativas antigas indefinidamente.
    attempt_count = case
      when public.login_ip_attempts.window_start < now() - interval '15 minutes' then 1
      else public.login_ip_attempts.attempt_count + 1
    end,
    window_start = case
      when public.login_ip_attempts.window_start < now() - interval '15 minutes' then now()
      else public.login_ip_attempts.window_start
    end,
    updated_at = now()
  returning attempt_count, window_start into v_count, v_window_start;

  if v_count >= 20 then
    update public.login_ip_attempts
      set blocked_until = now() + interval '15 minutes'
      where ip = p_ip;
  end if;
end;
$$;

revoke execute on function public.register_login_ip_attempt(text, boolean) from public;
grant execute on function public.register_login_ip_attempt(text, boolean) to anon, authenticated;
