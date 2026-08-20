-- Arquivo-modelo (.docx/.pdf) que serve de base para o modelo de contrato.
alter table public.contract_templates
  add column source_file_path text,
  add column source_file_name text,
  add column source_file_size bigint;

-- Excluir um modelo deve limpar sua estrutura (campos/cláusulas anexados),
-- mas NUNCA contratos já gerados a partir dele (contracts.template_id
-- permanece RESTRICT — a exclusão falha com 23503 se houver contratos).
alter table public.template_fields
  drop constraint template_fields_template_id_fkey,
  add constraint template_fields_template_id_fkey
    foreign key (template_id) references public.contract_templates (id) on delete cascade;

alter table public.template_clauses
  drop constraint template_clauses_template_id_fkey,
  add constraint template_clauses_template_id_fkey
    foreign key (template_id) references public.contract_templates (id) on delete cascade;

-- Bucket privado para os arquivos-modelo; caminho: {org_id}/{template_id}/{arquivo}
insert into storage.buckets (id, name, public)
values ('contract-templates', 'contract-templates', false)
on conflict (id) do nothing;

create policy "contract_template_files_select_org"
on storage.objects for select
using (
  bucket_id = 'contract-templates'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "contract_template_files_insert_editors"
on storage.objects for insert
with check (
  bucket_id = 'contract-templates'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and public.can_edit_clauses()
);

create policy "contract_template_files_update_editors"
on storage.objects for update
using (
  bucket_id = 'contract-templates'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and public.can_edit_clauses()
);

create policy "contract_template_files_delete_editors"
on storage.objects for delete
using (
  bucket_id = 'contract-templates'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and public.can_edit_clauses()
);
