-- ============================================================================
-- Dados da empresa (contratante nos contratos), sócios (bloco de assinatura
-- adicional) e convite de novos usuários — só Sócio/Admin administram.
-- ============================================================================

alter table public.organizations
  add column endereco jsonb,
  add column telefone text,
  add column email text;

create policy "org_update_socio" on public.organizations
  for update using (id = public.current_org_id() and public.current_user_role() in ('socio', 'admin'))
  with check (id = public.current_org_id() and public.current_user_role() in ('socio', 'admin'));

-- ----------------------------------------------------------------------------
-- SÓCIOS (bloco de assinatura adicional nos contratos gerados — opcional)
-- ----------------------------------------------------------------------------
create table public.company_partners (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  full_name text not null,
  cpf text,
  role_title text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_company_partners_org on public.company_partners (org_id);

create trigger trg_company_partners_updated_at before update on public.company_partners
  for each row execute function public.set_updated_at();

alter table public.company_partners enable row level security;

create policy "company_partners_select_org" on public.company_partners
  for select using (org_id = public.current_org_id());
create policy "company_partners_write_socio" on public.company_partners
  for all using (org_id = public.current_org_id() and public.current_user_role() in ('socio', 'admin'))
  with check (org_id = public.current_org_id() and public.current_user_role() in ('socio', 'admin'));

-- ----------------------------------------------------------------------------
-- CONVITES (cadastro de novo usuário — só Sócio/Admin geram; sem precisar da
-- service_role key, o convidado se cadastra via link e o trigger abaixo
-- confere o token antes de aplicar a role escolhida)
-- ----------------------------------------------------------------------------
create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  email text not null,
  role public.user_role not null,
  token text not null unique,
  created_by uuid not null references public.profiles (id),
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_org_invites_org on public.org_invites (org_id);
create index idx_org_invites_token on public.org_invites (token);

alter table public.org_invites enable row level security;

create policy "org_invites_select_socio" on public.org_invites
  for select using (org_id = public.current_org_id() and public.current_user_role() in ('socio', 'admin'));
create policy "org_invites_insert_socio" on public.org_invites
  for insert with check (org_id = public.current_org_id() and public.current_user_role() in ('socio', 'admin'));

-- RPC pública mínima para a tela de aceite do convite (usuário ainda não
-- está autenticado) — só expõe o necessário para montar o formulário, nunca
-- a lista de convites em si (isso segue protegido pelas policies acima).
create or replace function public.get_invite_info(p_token text)
returns table (org_id uuid, org_name text, email text, role public.user_role, valid boolean)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select o.id, o.name, i.email, i.role, (i.used_at is null and i.expires_at > now())
  from public.org_invites i
  join public.organizations o on o.id = i.org_id
  where i.token = p_token;
end;
$$;

revoke execute on function public.get_invite_info(text) from public;
grant execute on function public.get_invite_info(text) to anon, authenticated;

-- Atualiza handle_new_user(): quando a organização já tem dono, a role só
-- deixa de ser a de menor privilégio se houver um convite válido, não usado,
-- não expirado e com o e-mail batendo — nunca confia no metadata do client.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_role public.user_role;
  v_invite_token text;
  v_invite public.org_invites;
begin
  v_org_id := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_invite_token := new.raw_user_meta_data ->> 'invite_token';

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
