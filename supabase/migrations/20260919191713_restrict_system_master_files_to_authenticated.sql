-- A policy anterior não restringia por role — qualquer chamada com a anon
-- key (pública) também casava. Ajuste para exigir usuário autenticado,
-- como o comentário original já pretendia.
drop policy "contract_template_files_select_system_master" on storage.objects;

create policy "contract_template_files_select_system_master"
on storage.objects for select
to authenticated
using (
  bucket_id = 'contract-templates'
  and (storage.foldername(name))[1] = '_system_master'
);
