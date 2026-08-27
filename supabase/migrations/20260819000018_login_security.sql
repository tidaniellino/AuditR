-- ============================================================================
-- Segurança de login: troca de senha obrigatória no primeiro acesso (usuários
-- cadastrados diretamente pelo Sócio, com senha definida na hora) e bloqueio
-- por tentativas erradas (3 erros -> aguardar 3 min; mais 3 erros -> bloqueio
-- que só um Sócio ou o fluxo de "esqueci minha senha" desfazem).
-- ============================================================================

alter table public.profiles
  add column must_change_password boolean not null default false,
  add column failed_login_attempts int not null default 0,
  add column login_locked_until timestamptz,
  add column login_blocked boolean not null default false;

-- Consultado pela tela de login ANTES de tentar autenticar — não há sessão
-- ainda, por isso precisa ser security definer e liberado para anon.
create or replace function public.check_login_lockout(p_email text)
returns table (blocked boolean, locked_until timestamptz)
language sql stable security definer set search_path = public as $$
  select coalesce(login_blocked, false), login_locked_until
  from public.profiles
  where lower(email) = lower(p_email)
  limit 1;
$$;

revoke execute on function public.check_login_lockout(text) from public;
grant execute on function public.check_login_lockout(text) to anon, authenticated;

-- Chamado pela tela de login depois de tentar autenticar (sucesso ou falha),
-- pelo mesmo motivo acima (ainda pode não haver sessão em caso de falha).
create or replace function public.register_login_result(p_email text, p_success boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_attempts int;
begin
  if p_success then
    update public.profiles
      set failed_login_attempts = 0, login_locked_until = null
      where lower(email) = lower(p_email);
    return;
  end if;

  update public.profiles
    set failed_login_attempts = failed_login_attempts + 1
    where lower(email) = lower(p_email)
    returning failed_login_attempts into v_attempts;

  if v_attempts is null then
    return; -- e-mail não corresponde a nenhum usuário
  end if;

  if v_attempts = 3 then
    update public.profiles set login_locked_until = now() + interval '3 minutes'
      where lower(email) = lower(p_email);
  elsif v_attempts >= 6 then
    update public.profiles set login_blocked = true, login_locked_until = null
      where lower(email) = lower(p_email);
  end if;
end;
$$;

revoke execute on function public.register_login_result(text, boolean) from public;
grant execute on function public.register_login_result(text, boolean) to anon, authenticated;

-- Desbloqueio manual — só Sócio. Também usado depois de uma redefinição de
-- senha bem-sucedida (chamado com o id do próprio usuário nesse caso).
create or replace function public.unlock_member_login(p_member_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() é null para chamadas anônimas — sem essa checagem explícita, as
  -- comparações abaixo (`<>` com null) resultam em null, e "if null" é tratado
  -- como falso pelo plpgsql, deixando a checagem de permissão passar batido.
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  if coalesce(public.current_user_role(), 'x') <> 'socio' and auth.uid() <> p_member_id then
    raise exception 'Apenas um Sócio pode desbloquear o login de outro usuário';
  end if;

  update public.profiles
    set failed_login_attempts = 0, login_locked_until = null, login_blocked = false
    where id = p_member_id;
end;
$$;

revoke execute on function public.unlock_member_login(uuid) from public;
grant execute on function public.unlock_member_login(uuid) to authenticated;
