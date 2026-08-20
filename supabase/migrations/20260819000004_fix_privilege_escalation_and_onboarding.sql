-- ============================================================================
-- Correções de segurança encontradas antes de implementar o onboarding:
--
-- 1) profiles_update_self permitia que qualquer usuário alterasse a própria
--    role/org_id/active via UPDATE direto (RLS só checava id = auth.uid(),
--    sem checar quais colunas mudavam) — auto-promoção a Sócio.
-- 2) handle_new_user() confiava cegamente em org_id/role vindos do metadata
--    de auth.signUp(), que é uma chamada pública — qualquer pessoa podia se
--    cadastrar como "socio" de uma organização já existente de outro escritório.
--
-- Correção: trigger que bloqueia alteração de campos privilegiados em
-- profiles fora de socio/admin, e organizations ganha owner_claimed_at:
-- o primeiro usuário de uma org nova vira socio automaticamente; qualquer
-- signup subsequente para um org_id já reivindicado é forçado para a role
-- de menor privilégio, ignorando o que vier do client. Convite de novos
-- membros para role específica fica para uma função futura (só socio/admin).
-- ============================================================================

alter table public.organizations add column owner_claimed_at timestamptz;

create or replace function public.guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.org_id is distinct from old.org_id
      or new.active is distinct from old.active)
     and public.current_user_role() not in ('socio', 'admin') then
    raise exception 'Apenas Sócio ou Administrador podem alterar role, organização ou status ativo de um perfil';
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile_privileged_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

revoke execute on function public.guard_profile_privileged_fields() from public, anon, authenticated;

-- RPC pública mínima para o onboarding: só cria a "casca" da organização
-- (nome/cnpj), nada sensível. O usuário ainda não existe nesse momento.
create or replace function public.create_organization(p_name text, p_cnpj text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Nome da organização é obrigatório';
  end if;

  insert into public.organizations (name, cnpj) values (trim(p_name), nullif(trim(p_cnpj), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_role public.user_role;
begin
  v_org_id := (new.raw_user_meta_data ->> 'org_id')::uuid;

  if v_org_id is null then
    raise exception 'Cadastro requer uma organização (org_id ausente no metadata)';
  end if;

  select * into v_org from public.organizations where id = v_org_id for update;
  if not found then
    raise exception 'Organização não encontrada';
  end if;

  if v_org.owner_claimed_at is null then
    -- primeiro usuário da organização: vira Sócio e reivindica a org.
    v_role := 'socio';
    update public.organizations set owner_claimed_at = now() where id = v_org_id;
  else
    -- organização já tem dono: ignora role vindo do client (não confiável)
    -- e usa o menor privilégio; promoções reais são feitas por um Sócio
    -- já autenticado via UPDATE em profiles (protegido pelo trigger acima).
    v_role := 'contador_junior';
  end if;

  insert into public.profiles (id, org_id, full_name, email, role)
  values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    v_role
  );
  return new;
end;
$$;
