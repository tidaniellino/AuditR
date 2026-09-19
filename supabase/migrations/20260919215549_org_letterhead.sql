-- Papel timbrado da organização: um arquivo .docx (com cabeçalho/rodapé já
-- configurados no Word) que pode ser usado como formatação visual ao gerar
-- um contrato. Um por organização (substituído ao enviar um novo).
alter table public.organizations
  add column letterhead_file_path text,
  add column letterhead_file_name text,
  add column letterhead_file_size bigint;

insert into storage.buckets (id, name, public)
values ('org-letterheads', 'org-letterheads', false)
on conflict (id) do nothing;

create policy "org_letterhead_select_org"
on storage.objects for select
using (
  bucket_id = 'org-letterheads'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "org_letterhead_insert_socio"
on storage.objects for insert
with check (
  bucket_id = 'org-letterheads'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and public.current_user_role() = 'socio'
);

create policy "org_letterhead_update_socio"
on storage.objects for update
using (
  bucket_id = 'org-letterheads'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and public.current_user_role() = 'socio'
);

create policy "org_letterhead_delete_socio"
on storage.objects for delete
using (
  bucket_id = 'org-letterheads'
  and (storage.foldername(name))[1] = public.current_org_id()::text
  and public.current_user_role() = 'socio'
);
