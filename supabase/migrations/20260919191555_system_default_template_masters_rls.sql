-- Catálogo interno (metadados dos 8 modelos fixos); não é dado sensível de
-- nenhuma organização, mas precisa de RLS habilitada para não ficar exposta
-- sem controle via PostgREST. Só leitura para quem estiver autenticado; só a
-- service role (que ignora RLS) grava aqui.
alter table public.system_default_template_masters enable row level security;

create policy "system_default_template_masters_select_authenticated"
on public.system_default_template_masters for select
using (auth.role() = 'authenticated');
