-- ============================================================================
-- Regra 4 (login social): signInWithOAuth("google") nunca passa pela RPC
-- create_organization/onboarding — o metadata do usuário vem só do que o
-- Google devolve (nome, e-mail, avatar), sem org_id nenhum. A versão atual
-- de handle_new_user() (20260920004812) rejeita qualquer cadastro sem
-- org_id, o que bloquearia 100% dos cadastros novos via Google.
--
-- Reintroduz o auto-provisionamento de organização pra esse caso (mesmo
-- comportamento de "primeiro usuário = Sócio de uma org nova" que o
-- onboarding por e-mail já tem), preservando as correções de segurança da
-- versão anterior (convite obrigatório pra entrar em org já reivindicada,
-- seed dos modelos de contrato padrão do sistema).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_role public.user_role;
  v_invite_token text;
  v_invite public.org_invites;
  v_cpf text;
  v_is_new_org boolean;
  v_full_name text;
begin
  v_org_id := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_invite_token := new.raw_user_meta_data ->> 'invite_token';
  v_cpf := nullif(trim(new.raw_user_meta_data ->> 'cpf'), '');
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.email
  );

  if v_org_id is null then
    insert into public.organizations (name, owner_claimed_at)
    values (coalesce(v_full_name, new.email) || ' — Escritório', now())
    returning id into v_org_id;

    v_is_new_org := true;
    v_role := 'socio';
  else
    select * into v_org from public.organizations where id = v_org_id for update;
    if not found then
      raise exception 'Organização não encontrada';
    end if;

    v_is_new_org := v_org.owner_claimed_at is null;

    if v_is_new_org then
      v_role := 'socio';
      update public.organizations set owner_claimed_at = now() where id = v_org_id;
    else
      if v_invite_token is null then
        raise exception 'Esta organização já possui um responsável. É necessário um convite válido para se cadastrar.';
      end if;

      select * into v_invite
      from public.org_invites
      where token = v_invite_token
        and org_id = v_org_id
        and used_at is null
        and expires_at > now()
        and lower(email) = lower(new.email)
      for update;

      if not found then
        raise exception 'Convite inválido, expirado ou e-mail não corresponde ao convite.';
      end if;

      v_role := v_invite.role;
      update public.org_invites set used_at = now() where id = v_invite.id;
    end if;
  end if;

  insert into public.profiles (id, org_id, full_name, email, role, cpf)
  values (new.id, v_org_id, v_full_name, new.email, v_role, v_cpf);

  if v_is_new_org then
    insert into public.contract_templates
      (org_id, name, description, contract_type, active, created_by, is_system_default,
       source_file_path, source_file_name, source_file_size)
    select
      v_org_id, t.name, t.description, t.contract_type, true, new.id, true,
      t.source_file_path, t.source_file_name, t.source_file_size
    from public.system_default_template_masters t;
  end if;

  return new;
end;
$$;
