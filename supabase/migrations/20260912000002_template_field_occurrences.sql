-- ============================================================================
-- Identificação e classificação de campos "[TEXTO ENTRE COLCHETES]" nos
-- modelos de contrato: cada OCORRÊNCIA (não só o texto único do campo) é
-- classificada como pertencente à parte Contratante, Contratada, ou "campo
-- específico do contrato" (sem correspondência cadastral). Guardado junto
-- ao modelo para não repetir a análise a cada contrato gerado a partir dele.
-- ============================================================================

alter table public.contract_templates
  add column fields_analyzed_at timestamptz;

create table public.template_field_occurrences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  template_id uuid not null references public.contract_templates (id) on delete cascade,
  occurrence_index int not null,
  raw_text text not null,
  paragraph_index int not null,
  context_snippet text not null,
  role text not null check (role in ('contratante', 'contratada', 'especifico')),
  attribute_key text,
  confidence text not null default 'high' check (confidence in ('high', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, occurrence_index)
);

create index idx_template_field_occurrences_template
  on public.template_field_occurrences (template_id, occurrence_index);

create trigger trg_template_field_occurrences_updated_at before update on public.template_field_occurrences
  for each row execute function public.set_updated_at();

alter table public.template_field_occurrences enable row level security;

-- Mesmo nível de permissão de escrita de contract_templates (qualquer
-- membro autenticado da org gerencia — can_edit_clauses() hoje só checa
-- role não-nula, não é restrito a Sócio).
create policy "template_field_occurrences_select_org" on public.template_field_occurrences
  for select using (org_id = public.current_org_id());

create policy "template_field_occurrences_write_org" on public.template_field_occurrences
  for all using (
    org_id = public.current_org_id()
    and exists (select 1 from public.contract_templates t where t.id = template_id and t.org_id = public.current_org_id())
  )
  with check (
    org_id = public.current_org_id()
    and exists (select 1 from public.contract_templates t where t.id = template_id and t.org_id = public.current_org_id())
  );
