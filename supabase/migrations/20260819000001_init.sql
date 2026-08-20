-- ============================================================================
-- AuditR Contratos / SmartDoc Tax — schema inicial (Supabase / PostgreSQL)
-- pgcrypto (gen_random_uuid) já vem habilitado por padrão nos projetos Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type public.user_role as enum (
  'socio',
  'compliance_legal',
  'advogado_senior',
  'advogado_junior',
  'contador_senior',
  'contador_junior',
  'admin'
);

create type public.pessoa_tipo as enum ('PF', 'PJ');

create type public.clause_status as enum ('draft', 'approved', 'deprecated');

create type public.document_status as enum (
  'rascunho',
  'em_revisao',
  'aguardando_assinatura',
  'assinado',
  'arquivado'
);

create type public.signature_provider as enum ('clicksign', 'd4sign', 'docusign', 'govbr');

create type public.whatsapp_status as enum ('pending', 'sent', 'delivered', 'read', 'failed');

-- ----------------------------------------------------------------------------
-- ORGANIZATIONS (multi-tenant: cada escritório é um tenant)
-- ----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFILES (perfil do usuário, vinculado a auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id),
  full_name text not null,
  email text not null,
  role public.user_role not null default 'contador_junior',
  oab_crc text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_profiles_org on public.profiles (org_id);

-- ----------------------------------------------------------------------------
-- CLIENTS (cadastro centralizado PF/PJ)
-- ----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  tipo_pessoa public.pessoa_tipo not null,
  cpf_cnpj text not null,
  nome_razao_social text not null,
  nome_fantasia text,
  receita_federal_data jsonb,
  receita_federal_synced_at timestamptz,
  email text,
  telefone text,
  endereco jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, cpf_cnpj)
);

create index idx_clients_org on public.clients (org_id);

-- ----------------------------------------------------------------------------
-- BIBLIOTECA DE CLÁUSULAS
-- ----------------------------------------------------------------------------
create table public.clause_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  name text not null,
  description text,
  unique (org_id, name)
);

create table public.clauses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  category_id uuid references public.clause_categories (id),
  title text not null,
  status public.clause_status not null default 'draft',
  current_version_id uuid, -- FK adicionada após criar clause_versions
  clause_type text, -- ex: 'foro', 'arbitragem', 'confidencialidade' (usado na validação cruzada)
  applicable_contract_types text[] not null default '{}',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index idx_clauses_org on public.clauses (org_id);

-- Versionamento imutável: cada alteração gera uma nova linha (v1.0 -> v1.1)
create table public.clause_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  clause_id uuid not null references public.clauses (id),
  version_number text, -- preenchido automaticamente via trigger se nulo
  content text not null, -- markdown/rich text com placeholders {{variavel}}
  change_reason text,
  changed_by uuid not null references public.profiles (id),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clause_id, version_number)
);

alter table public.clauses
  add constraint fk_clauses_current_version
  foreign key (current_version_id) references public.clause_versions (id);

create index idx_clause_versions_clause on public.clause_versions (clause_id);

-- Incompatibilidades entre cláusulas (validação cruzada, ex: foro cível x arbitragem)
create table public.clause_incompatibilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  clause_id_a uuid not null references public.clauses (id),
  clause_id_b uuid not null references public.clauses (id),
  reason text not null,
  severity text not null default 'error' check (severity in ('error', 'warning')),
  check (clause_id_a <> clause_id_b)
);

-- ----------------------------------------------------------------------------
-- MOTOR DE REGRAS E VARIÁVEIS (formulário dinâmico)
-- ----------------------------------------------------------------------------
create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  key text not null, -- nome da variável, ex: 'valor_contrato'
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'select', 'boolean', 'cpf_cnpj')),
  options jsonb,
  is_required boolean not null default false,
  validation_regex text,
  unique (org_id, key)
);

create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  name text not null,
  description text,
  contract_type text,
  active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.template_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  template_id uuid not null references public.contract_templates (id),
  field_id uuid not null references public.form_fields (id),
  order_index int not null default 0,
  unique (template_id, field_id)
);

create table public.template_clauses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  template_id uuid not null references public.contract_templates (id),
  clause_id uuid not null references public.clauses (id),
  order_index int not null default 0,
  is_optional boolean not null default false,
  -- lógica condicional: {"field":"possui_garantia","operator":"eq","value":true}
  condition_expression jsonb,
  unique (template_id, clause_id)
);

-- ----------------------------------------------------------------------------
-- CONTRATOS (documentos)
-- ----------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  client_id uuid not null references public.clients (id),
  template_id uuid not null references public.contract_templates (id),
  title text not null,
  status public.document_status not null default 'rascunho',
  created_by uuid not null references public.profiles (id),
  signature_provider public.signature_provider,
  signature_external_id text,
  signature_link text,
  signed_document_url text,
  signed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contracts_org on public.contracts (org_id);
create index idx_contracts_status on public.contracts (status);

create table public.contract_answers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contract_id uuid not null references public.contracts (id),
  field_id uuid not null references public.form_fields (id),
  value jsonb,
  unique (contract_id, field_id)
);

-- snapshot da cláusula + versão vigente no momento da criação do contrato
create table public.contract_clauses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contract_id uuid not null references public.contracts (id),
  clause_id uuid not null references public.clauses (id),
  clause_version_id uuid not null references public.clause_versions (id),
  order_index int not null default 0,
  content_snapshot text not null,
  included boolean not null default true -- resultado da lógica condicional
);

create table public.contract_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contract_id uuid not null references public.contracts (id),
  from_status public.document_status,
  to_status public.document_status not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);

create table public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contract_id uuid not null references public.contracts (id),
  provider public.signature_provider not null,
  external_id text,
  status text not null default 'created',
  signers jsonb not null,
  webhook_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contract_id uuid not null references public.contracts (id),
  client_id uuid not null references public.clients (id),
  phone text not null,
  message text not null,
  status public.whatsapp_status not null default 'pending',
  provider_message_id text,
  triggered_by uuid references public.profiles (id),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- AUDITORIA (LGPD)
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id),
  user_id uuid references public.profiles (id),
  action text not null, -- 'insert' | 'update' | 'delete' | 'login' | 'export' | 'sign_request'
  entity_type text not null,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_org on public.audit_logs (org_id);
create index idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- ============================================================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER — usadas nas policies de RLS)
-- ============================================================================
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_edit_clauses()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('socio', 'compliance_legal');
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger trg_contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Signup -> cria profile automaticamente (org_id e role vindos do metadata)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, org_id, full_name, email, role)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'org_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'contador_junior')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Versionamento de cláusulas: numeração automática + flag is_current
-- ----------------------------------------------------------------------------
create or replace function public.next_clause_version_number(p_clause_id uuid)
returns text language plpgsql stable as $$
declare
  v_last text;
  v_major int;
  v_minor int;
begin
  select version_number into v_last
  from public.clause_versions
  where clause_id = p_clause_id
  order by created_at desc
  limit 1;

  if v_last is null then
    return 'v1.0';
  end if;

  v_major := split_part(replace(v_last, 'v', ''), '.', 1)::int;
  v_minor := split_part(replace(v_last, 'v', ''), '.', 2)::int;
  return 'v' || v_major || '.' || (v_minor + 1);
end;
$$;

create or replace function public.assign_clause_version_number()
returns trigger language plpgsql as $$
begin
  if new.version_number is null then
    new.version_number := public.next_clause_version_number(new.clause_id);
  end if;
  return new;
end;
$$;

create trigger trg_assign_clause_version
  before insert on public.clause_versions
  for each row execute function public.assign_clause_version_number();

create or replace function public.set_clause_version_current()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_current then
    update public.clause_versions
      set is_current = false
      where clause_id = new.clause_id and id <> new.id and is_current = true;

    update public.clauses
      set current_version_id = new.id, status = 'approved'
      where id = new.clause_id;
  end if;
  return new;
end;
$$;

create trigger trg_clause_version_current
  after insert on public.clause_versions
  for each row execute function public.set_clause_version_current();

-- ----------------------------------------------------------------------------
-- Trilha de status obrigatória dos contratos (rascunho > em_revisao >
-- aguardando_assinatura > assinado > arquivado) — apenas avanço sequencial.
-- ----------------------------------------------------------------------------
create or replace function public.validate_contract_status_transition()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order text[] := array['rascunho', 'em_revisao', 'aguardando_assinatura', 'assinado', 'arquivado'];
  v_old_idx int;
  v_new_idx int;
begin
  if old.status is distinct from new.status then
    v_old_idx := array_position(v_order, old.status::text);
    v_new_idx := array_position(v_order, new.status::text);

    if v_new_idx is null or v_new_idx <> v_old_idx + 1 then
      raise exception 'Transição de status inválida: % -> %. Trilha obrigatória: %',
        old.status, new.status, array_to_string(v_order, ' > ');
    end if;

    insert into public.contract_status_history (org_id, contract_id, from_status, to_status, changed_by)
    values (new.org_id, new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_contract_status_guard
  before update on public.contracts
  for each row execute function public.validate_contract_status_transition();

-- ----------------------------------------------------------------------------
-- Gatilho do WhatsApp: só permite notificar após revisão concluída
-- (status = aguardando_assinatura) e link oficial de assinatura gerado.
-- ----------------------------------------------------------------------------
create or replace function public.validate_whatsapp_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id = new.contract_id;

  if v_contract.status <> 'aguardando_assinatura' or v_contract.signature_link is null then
    raise exception 'Disparo de WhatsApp só é permitido após a revisão interna e geração do link de assinatura (status atual: %)', v_contract.status;
  end if;
  return new;
end;
$$;

create trigger trg_whatsapp_gate
  before insert on public.whatsapp_notifications
  for each row execute function public.validate_whatsapp_trigger();

-- ----------------------------------------------------------------------------
-- Auditoria automática (LGPD) em tabelas sensíveis
-- ----------------------------------------------------------------------------
create or replace function public.audit_log_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (org_id, user_id, action, entity_type, entity_id, metadata)
  values (
    coalesce(new.org_id, old.org_id),
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_clients after insert or update or delete on public.clients
  for each row execute function public.audit_log_trigger();
create trigger trg_audit_clauses after insert or update or delete on public.clauses
  for each row execute function public.audit_log_trigger();
create trigger trg_audit_clause_versions after insert or update or delete on public.clause_versions
  for each row execute function public.audit_log_trigger();
create trigger trg_audit_contracts after insert or update or delete on public.contracts
  for each row execute function public.audit_log_trigger();

-- ----------------------------------------------------------------------------
-- Validação antes da exportação: campos obrigatórios + incompatibilidades
-- entre cláusulas incluídas no contrato. Chamar antes de gerar .docx/.pdf.
-- ----------------------------------------------------------------------------
create or replace function public.validate_contract_for_export(p_contract_id uuid)
returns table (is_valid boolean, missing_fields text[], clause_incompatibilities text[])
language plpgsql stable security definer set search_path = public as $$
declare
  v_template_id uuid;
  v_missing text[];
  v_incompat text[];
begin
  select template_id into v_template_id from public.contracts where id = p_contract_id;

  select coalesce(array_agg(ff.label), '{}') into v_missing
  from public.template_fields tf
  join public.form_fields ff on ff.id = tf.field_id
  where tf.template_id = v_template_id
    and ff.is_required
    and not exists (
      select 1 from public.contract_answers ca
      where ca.contract_id = p_contract_id
        and ca.field_id = ff.id
        and ca.value is not null
        and ca.value::text not in ('null', '""')
    );

  select coalesce(array_agg(distinct ci.reason), '{}') into v_incompat
  from public.contract_clauses cc1
  join public.contract_clauses cc2
    on cc2.contract_id = cc1.contract_id and cc2.clause_id <> cc1.clause_id
  join public.clause_incompatibilities ci
    on ci.clause_id_a = cc1.clause_id and ci.clause_id_b = cc2.clause_id
  where cc1.contract_id = p_contract_id
    and cc1.included and cc2.included
    and ci.severity = 'error';

  return query select
    (coalesce(array_length(v_missing, 1), 0) = 0 and coalesce(array_length(v_incompat, 1), 0) = 0),
    v_missing,
    v_incompat;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.clause_categories enable row level security;
alter table public.clauses enable row level security;
alter table public.clause_versions enable row level security;
alter table public.clause_incompatibilities enable row level security;
alter table public.form_fields enable row level security;
alter table public.contract_templates enable row level security;
alter table public.template_fields enable row level security;
alter table public.template_clauses enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_answers enable row level security;
alter table public.contract_clauses enable row level security;
alter table public.contract_status_history enable row level security;
alter table public.signature_requests enable row level security;
alter table public.whatsapp_notifications enable row level security;
alter table public.audit_logs enable row level security;

-- organizations: visível apenas para membros; criação via service_role (onboarding)
create policy "org_select_members" on public.organizations
  for select using (id = public.current_org_id());

-- profiles
create policy "profiles_select_org" on public.profiles
  for select using (org_id = public.current_org_id());
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- clients
create policy "clients_select_org" on public.clients
  for select using (org_id = public.current_org_id());
create policy "clients_insert_org" on public.clients
  for insert with check (org_id = public.current_org_id());
create policy "clients_update_org" on public.clients
  for update using (org_id = public.current_org_id());

-- clause_categories
create policy "clause_categories_select_org" on public.clause_categories
  for select using (org_id = public.current_org_id());
create policy "clause_categories_write_editors" on public.clause_categories
  for all using (org_id = public.current_org_id() and public.can_edit_clauses())
  with check (org_id = public.current_org_id() and public.can_edit_clauses());

-- clauses: todos os perfis do escritório podem LER (usar); só socio/compliance
-- podem criar/alterar cláusulas-padrão (RN — Bloqueio de Edição / RBAC).
create policy "clauses_select_org" on public.clauses
  for select using (org_id = public.current_org_id());
create policy "clauses_insert_editors" on public.clauses
  for insert with check (org_id = public.current_org_id() and public.can_edit_clauses());
create policy "clauses_update_editors" on public.clauses
  for update using (org_id = public.current_org_id() and public.can_edit_clauses());

-- clause_versions: leitura para todos do org; inserção (nova versão) só para editores;
-- imutável — sem policy de update/delete.
create policy "clause_versions_select_org" on public.clause_versions
  for select using (org_id = public.current_org_id());
create policy "clause_versions_insert_editors" on public.clause_versions
  for insert with check (org_id = public.current_org_id() and public.can_edit_clauses());

-- clause_incompatibilities
create policy "clause_incompat_select_org" on public.clause_incompatibilities
  for select using (org_id = public.current_org_id());
create policy "clause_incompat_write_editors" on public.clause_incompatibilities
  for all using (org_id = public.current_org_id() and public.can_edit_clauses())
  with check (org_id = public.current_org_id() and public.can_edit_clauses());

-- form_fields / templates / template_fields / template_clauses: leitura geral,
-- escrita restrita a socio/compliance_legal (conteúdo "padrão" do escritório).
create policy "form_fields_select_org" on public.form_fields
  for select using (org_id = public.current_org_id());
create policy "form_fields_write_editors" on public.form_fields
  for all using (org_id = public.current_org_id() and public.can_edit_clauses())
  with check (org_id = public.current_org_id() and public.can_edit_clauses());

create policy "contract_templates_select_org" on public.contract_templates
  for select using (org_id = public.current_org_id());
create policy "contract_templates_write_editors" on public.contract_templates
  for all using (org_id = public.current_org_id() and public.can_edit_clauses())
  with check (org_id = public.current_org_id() and public.can_edit_clauses());

create policy "template_fields_select_org" on public.template_fields
  for select using (org_id = public.current_org_id());
create policy "template_fields_write_editors" on public.template_fields
  for all using (org_id = public.current_org_id() and public.can_edit_clauses())
  with check (org_id = public.current_org_id() and public.can_edit_clauses());

create policy "template_clauses_select_org" on public.template_clauses
  for select using (org_id = public.current_org_id());
create policy "template_clauses_write_editors" on public.template_clauses
  for all using (org_id = public.current_org_id() and public.can_edit_clauses())
  with check (org_id = public.current_org_id() and public.can_edit_clauses());

-- contracts: qualquer perfil do escritório pode criar/usar; a trilha de status
-- é validada pelo trigger trg_contract_status_guard.
create policy "contracts_select_org" on public.contracts
  for select using (org_id = public.current_org_id());
create policy "contracts_insert_org" on public.contracts
  for insert with check (org_id = public.current_org_id());
create policy "contracts_update_org" on public.contracts
  for update using (org_id = public.current_org_id());

create policy "contract_answers_select_org" on public.contract_answers
  for select using (org_id = public.current_org_id());
create policy "contract_answers_write_org" on public.contract_answers
  for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "contract_clauses_select_org" on public.contract_clauses
  for select using (org_id = public.current_org_id());
create policy "contract_clauses_write_org" on public.contract_clauses
  for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "contract_status_history_select_org" on public.contract_status_history
  for select using (org_id = public.current_org_id());
-- inserção só pelo trigger (security definer) — sem policy de insert para o client.

-- signature_requests e whatsapp_notifications: leitura para o escritório; a
-- escrita é feita por Edge Functions com a service_role key (bypassa RLS),
-- pois integram com provedores externos (ICP-Brasil/Gov.br e WhatsApp API).
create policy "signature_requests_select_org" on public.signature_requests
  for select using (org_id = public.current_org_id());

create policy "whatsapp_notifications_select_org" on public.whatsapp_notifications
  for select using (org_id = public.current_org_id());

-- audit_logs: LGPD — visível só para papéis de compliance/sócio/admin.
create policy "audit_logs_select_compliance" on public.audit_logs
  for select using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('socio', 'compliance_legal', 'admin')
  );
