-- ============================================================================
-- Login social (Google) não envia org_id no metadata — só nome/e-mail/avatar
-- do provedor. handle_new_user() antes exigia org_id e rejeitava o cadastro.
-- Agora: se não vier org_id, cria uma organização nova automaticamente e o
-- usuário vira Sócio dela — mesmo comportamento do onboarding por e-mail
-- (primeiro usuário de uma org = Sócio), só que sem o passo manual da RPC.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_role public.user_role;
  v_full_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.email
  );
  v_org_id := (new.raw_user_meta_data ->> 'org_id')::uuid;

  if v_org_id is null then
    insert into public.organizations (name, owner_claimed_at)
    values (coalesce(v_full_name, new.email) || ' — Escritório', now())
    returning id into v_org_id;

    insert into public.profiles (id, org_id, full_name, email, role)
    values (new.id, v_org_id, v_full_name, new.email, 'socio');
    return new;
  end if;

  select * into v_org from public.organizations where id = v_org_id for update;
  if not found then
    raise exception 'Organização não encontrada';
  end if;

  if v_org.owner_claimed_at is null then
    v_role := 'socio';
    update public.organizations set owner_claimed_at = now() where id = v_org_id;
  else
    v_role := 'contador_junior';
  end if;

  insert into public.profiles (id, org_id, full_name, email, role)
  values (new.id, v_org_id, v_full_name, new.email, v_role);
  return new;
end;
$$;
