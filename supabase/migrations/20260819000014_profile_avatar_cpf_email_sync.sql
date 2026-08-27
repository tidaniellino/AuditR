-- Foto de perfil e CPF pessoal (distinto do CNPJ/CPF da organização) —
-- preenchido no cadastro (onboarding ou aceite de convite) e nunca editável
-- pela própria tela de perfil (só exibido).
alter table public.profiles
  add column avatar_path text,
  add column cpf text;

-- Bucket privado para fotos de perfil; caminho: {org_id}/{user_id}/{arquivo}
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatar_files_select_org"
on storage.objects for select
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "avatar_files_insert_self"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "avatar_files_update_self"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "avatar_files_delete_self"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- profiles.email é preenchido só na criação (handle_new_user). Trocar o
-- e-mail de login é feito via supabase.auth.updateUser({email}), que exige
-- confirmação por link antes de valer — esse trigger espelha o e-mail em
-- profiles só depois que a troca é confirmada em auth.users.
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_profile_email
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- handle_new_user() passa a gravar o CPF pessoal (vindo do onboarding, só
-- quando o CPF/CNPJ informado tem 11 dígitos, ou do aceite de convite).
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
    v_role := 'contador_junior';

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
