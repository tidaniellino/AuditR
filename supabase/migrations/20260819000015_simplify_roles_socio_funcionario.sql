-- ============================================================================
-- Simplifica os perfis de usuário para só dois: Sócio e Funcionário.
-- Mantém o enum public.user_role com os valores antigos por segurança (evitar
-- a dança arriscada de recriar o tipo, que é referenciado por várias tabelas
-- e funções) — só deixam de ser usados/oferecidos pelo app a partir daqui.
-- Qualquer perfil com um valor antigo é remapeado para 'funcionario'.
-- ============================================================================

update public.profiles set role = 'funcionario' where role <> 'socio';

alter table public.profiles alter column role set default 'funcionario';

-- Funcionário agora pode fazer tudo que Sócio faz, exceto o que é guardado
-- por canManageOrg/current_user_role() = 'socio' no app (dados da empresa,
-- sócios, equipe) — então a checagem de "editor de cláusulas/modelos" deixa
-- de distinguir por role: qualquer perfil autenticado da organização passa.
create or replace function public.can_edit_clauses()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() is not null;
$$;

-- Só Sócio altera role/org_id/active de um perfil (não existe mais "admin").
create or replace function public.guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.org_id is distinct from old.org_id
      or new.active is distinct from old.active)
     and public.current_user_role() <> 'socio' then
    raise exception 'Apenas Sócio pode alterar role, organização ou status ativo de um perfil';
  end if;
  return new;
end;
$$;

drop policy if exists "audit_logs_select_compliance" on public.audit_logs;
create policy "audit_logs_select_compliance" on public.audit_logs
  for select using (org_id = public.current_org_id() and public.current_user_role() = 'socio');

drop policy if exists "org_update_socio" on public.organizations;
create policy "org_update_socio" on public.organizations
  for update using (id = public.current_org_id() and public.current_user_role() = 'socio')
  with check (id = public.current_org_id() and public.current_user_role() = 'socio');

drop policy if exists "company_partners_write_socio" on public.company_partners;
create policy "company_partners_write_socio" on public.company_partners
  for all using (org_id = public.current_org_id() and public.current_user_role() = 'socio')
  with check (org_id = public.current_org_id() and public.current_user_role() = 'socio');

drop policy if exists "org_invites_select_socio" on public.org_invites;
create policy "org_invites_select_socio" on public.org_invites
  for select using (org_id = public.current_org_id() and public.current_user_role() = 'socio');

drop policy if exists "org_invites_insert_socio" on public.org_invites;
create policy "org_invites_insert_socio" on public.org_invites
  for insert with check (org_id = public.current_org_id() and public.current_user_role() = 'socio');

-- handle_new_user(): usuário sem convite válido numa org já reivindicada
-- agora cai em 'funcionario' (menor privilégio), não mais 'contador_junior'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_role public.user_role;
  v_invite_token text;
  v_invite public.org_invites;
  v_cpf text;
begin
  v_org_id := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_invite_token := new.raw_user_meta_data ->> 'invite_token';
  v_cpf := nullif(trim(new.raw_user_meta_data ->> 'cpf'), '');

  if v_org_id is null then
    raise exception 'Cadastro requer uma organização (org_id ausente no metadata)';
  end if;

  select * into v_org from public.organizations where id = v_org_id for update;
  if not found then
    raise exception 'Organização não encontrada';
  end if;

  if v_org.owner_claimed_at is null then
    v_role := 'socio';
    update public.organizations set owner_claimed_at = now() where id = v_org_id;
  else
    v_role := 'funcionario';

    if v_invite_token is not null then
      select * into v_invite
      from public.org_invites
      where token = v_invite_token
        and org_id = v_org_id
        and used_at is null
        and expires_at > now()
        and lower(email) = lower(new.email)
      for update;

      if found then
        v_role := v_invite.role;
        update public.org_invites set used_at = now() where id = v_invite.id;
      end if;
    end if;
  end if;

  insert into public.profiles (id, org_id, full_name, email, role, cpf)
  values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    v_role,
    v_cpf
  );
  return new;
end;
$$;
