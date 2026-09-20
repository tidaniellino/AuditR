-- ============================================================================
-- CRÍTICO: handle_new_user() criava o profile normalmente (role
-- 'funcionario') mesmo quando a organização já tinha dono E não havia
-- convite válido — bastava saber o org_id (UUID) de QUALQUER escritório e
-- se cadastrar via POST direto em /auth/v1/signup (endpoint público, só
-- precisa da anon key) pra virar membro daquela org, com acesso de leitura
-- e escrita a tudo que é escopado por org_id = current_org_id() (clientes,
-- contratos, modelos, cláusulas...). O sistema de convites (org_invites/
-- get_invite_info) já existia no schema mas nunca foi ligado a nenhuma tela
-- — createMember() (único fluxo real de "adicionar membro") cria o usuário
-- direto via admin API, sem gerar convite, então o fallback silencioso
-- também "funcionava" pra esse caso.
--
-- Correção: sem convite válido pra uma org já reivindicada, REJEITA o
-- cadastro (não insere profile nenhum). createMember() passa a gerar um
-- convite de uso único (expira em 10 min) antes de chamar a admin API,
-- então o mesmo caminho de validação do trigger passa a valer pros dois
-- fluxos (convite por link e criação direta pelo Sócio).
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

  insert into public.profiles (id, org_id, full_name, email, role, cpf)
  values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    v_role,
    v_cpf
  );

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
