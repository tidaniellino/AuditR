-- Arquivos gerados (mesclados com dados do cliente) e hash de validação do
-- documento final assinado.
alter table public.contracts
  add column generated_docx_path text,
  add column generated_pdf_path text,
  add column document_hash text;

-- Código de assinatura enviado por e-mail (OTP de 6 dígitos, válido por 24h).
-- Guardamos só o hash do código — nunca o valor em texto puro.
create table public.signature_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  code_hash text not null,
  signer_email text not null,
  signer_name text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_signature_codes_contract on public.signature_codes (contract_id);

alter table public.signature_codes enable row level security;

create policy "signature_codes_select_org" on public.signature_codes
  for select using (org_id = public.current_org_id());
create policy "signature_codes_insert_org" on public.signature_codes
  for insert with check (org_id = public.current_org_id());

-- Bucket privado para os .docx/.pdf gerados por contrato (rascunho e versão
-- assinada). Caminho: {org_id}/{contract_id}/{arquivo}. Leitura/escrita pela
-- equipe segue RLS; a etapa pública de assinatura usa a service_role key
-- (o assinante não está autenticado no sistema).
insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', false)
on conflict (id) do nothing;

create policy "contract_documents_select_org"
on storage.objects for select
using (
  bucket_id = 'contract-documents'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "contract_documents_insert_org"
on storage.objects for insert
with check (
  bucket_id = 'contract-documents'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);
