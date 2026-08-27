-- Tabela dedicada de auditoria da assinatura eletrônica — complementa as
-- colunas signer_* em contracts (usadas para exibição rápida na tela). Fica
-- consultável mesmo que o PDF assinado seja perdido/regerado. Um registro
-- por contrato (unique contract_id) — reassinar o mesmo contrato nunca é
-- possível pela máquina de estados, mas o upsert por contract_id garante
-- idempotência mesmo assim: gerar de novo sobrescreve, nunca duplica.
create table public.signature_audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  signer_name text not null,
  signer_email text not null,
  signer_cpf text,
  signer_whatsapp text,
  ip text,
  user_agent text,
  geolocation text,
  otp_validated_at timestamptz not null,
  signature_registered_at timestamptz not null,
  document_hash text not null,
  created_at timestamptz not null default now(),
  unique (contract_id)
);

create index idx_signature_audit_logs_contract on public.signature_audit_logs (contract_id);

alter table public.signature_audit_logs enable row level security;

-- Escrita só pela Edge Function (roda com service_role, bypassa RLS) — sem
-- policy de insert/update para authenticated/anon, de propósito.
create policy "signature_audit_logs_select_org" on public.signature_audit_logs
  for select using (org_id = public.current_org_id());
