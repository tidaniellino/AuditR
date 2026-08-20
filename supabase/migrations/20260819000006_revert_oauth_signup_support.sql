-- Login social (Google) foi removido da interface — reverte handle_new_user()
-- para a versão estrita que exige org_id no metadata, fechando o caminho de
-- signUp() direto sem passar pela RPC create_organization/fluxo de onboarding.
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
    v_role := 'socio';
    update public.organizations set owner_claimed_at = now() where id = v_org_id;
  else
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
