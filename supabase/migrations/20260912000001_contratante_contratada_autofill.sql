-- ============================================================================
-- Suporte ao preenchimento automático da parte Contratante (cliente) e
-- Contratada (Minha Empresa) na geração de contratos:
--   - RG do cliente PF
--   - Representantes legais do cliente PJ (múltiplos, um marcado principal)
--   - Sócio signatário padrão (para quando só um sócio precisa assinar)
--   - Snapshot final dos dados de cada parte usados num contrato específico
--     (edição pontual não altera o cadastro, e não muda retroativamente se
--     o cadastro mudar depois)
-- ============================================================================

alter table public.clients
  add column rg text;

create table public.client_representatives (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  client_id uuid not null references public.clients (id) on delete cascade,
  full_name text not null,
  cpf text not null,
  rg text,
  is_principal boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_client_representatives_client on public.client_representatives (client_id);

-- Só um representante "principal" por cliente — resolve de forma
-- determinística o caso de múltiplos representantes cadastrados.
create unique index idx_client_representatives_one_principal
  on public.client_representatives (client_id) where (is_principal);

create trigger trg_client_representatives_updated_at before update on public.client_representatives
  for each row execute function public.set_updated_at();

alter table public.client_representatives enable row level security;

-- Mesmo nível de permissão do cadastro de clientes em si (qualquer membro
-- da org gerencia, sem restrição de role) — representante é parte do
-- cadastro do cliente, não da administração da organização.
create policy "client_representatives_select_org" on public.client_representatives
  for select using (org_id = public.current_org_id());

create policy "client_representatives_insert_org" on public.client_representatives
  for insert with check (
    org_id = public.current_org_id()
    and exists (select 1 from public.clients c where c.id = client_id and c.org_id = public.current_org_id())
  );

create policy "client_representatives_update_org" on public.client_representatives
  for update using (org_id = public.current_org_id())
  with check (
    org_id = public.current_org_id()
    and exists (select 1 from public.clients c where c.id = client_id and c.org_id = public.current_org_id())
  );

create policy "client_representatives_delete_org" on public.client_representatives
  for delete using (org_id = public.current_org_id());

-- ----------------------------------------------------------------------------
-- Sócio signatário padrão: só um por organização, só sócio pode alterar
-- (mesma trilha de privilégio de role/org_id/active já aplicada a profiles).
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column is_default_signer boolean not null default false,
  add constraint profiles_default_signer_requires_socio
    check (not is_default_signer or role = 'socio');

create unique index idx_profiles_one_default_signer
  on public.profiles (org_id) where (is_default_signer);

create or replace function public.guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.org_id is distinct from old.org_id
      or new.active is distinct from old.active
      or new.is_default_signer is distinct from old.is_default_signer)
     and public.current_user_role() <> 'socio' then
    raise exception 'Apenas Sócio pode alterar role, organização, status ativo ou signatário padrão de um perfil';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Snapshot de Contratante/Contratada por contrato.
-- ----------------------------------------------------------------------------
alter table public.contracts
  add column party_data jsonb;
