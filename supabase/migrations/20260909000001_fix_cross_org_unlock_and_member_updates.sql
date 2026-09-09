-- ============================================================================
-- Correções de segurança encontradas em auditoria (2026-09-09):
--
-- 1) unlock_member_login era SECURITY DEFINER e checava apenas o cargo do
--    chamador (current_user_role() = 'socio'), sem checar se p_member_id
--    pertence à mesma organização. Como a função ignora RLS, um Sócio de
--    qualquer organização conseguia zerar o bloqueio de login de um usuário
--    de OUTRA organização — bypass de isolamento multi-tenant.
--
-- 2) profiles só tinha a policy de UPDATE "profiles_update_self"
--    (using (id = auth.uid())), então toggleMemberActive/updateMemberRole em
--    empresa/actions.ts (que usam o client autenticado, não o admin) nunca
--    conseguiam de fato alterar o registro de OUTRO membro — o UPDATE batia
--    em zero linhas silenciosamente (sem erro), deixando a gestão de equipe
--    inoperante mesmo para um Sócio agindo dentro da própria organização.
--    Adiciona a policy que faltava, escopada à própria organização.
-- ============================================================================

create or replace function public.unlock_member_login(p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller_org uuid;
  v_target_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  if auth.uid() = p_member_id then
    update public.profiles
      set failed_login_attempts = 0, login_locked_until = null, login_blocked = false
      where id = p_member_id;
    return;
  end if;

  select org_id into v_caller_org from public.profiles where id = auth.uid();
  select org_id into v_target_org from public.profiles where id = p_member_id;

  if v_target_org is null then
    raise exception 'Usuário não encontrado';
  end if;

  if coalesce(public.current_user_role(), 'x') <> 'socio' or v_caller_org is distinct from v_target_org then
    raise exception 'Apenas um Sócio pode desbloquear o login de outro usuário da mesma organização';
  end if;

  update public.profiles
    set failed_login_attempts = 0, login_locked_until = null, login_blocked = false
    where id = p_member_id;
end;
$$;

revoke execute on function public.unlock_member_login(uuid) from public;
grant execute on function public.unlock_member_login(uuid) to authenticated;

create policy "profiles_update_org_managers" on public.profiles
  for update
  using (org_id = public.current_org_id() and public.current_user_role() = 'socio')
  with check (org_id = public.current_org_id());
