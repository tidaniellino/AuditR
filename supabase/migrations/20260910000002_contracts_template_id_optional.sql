-- Envio rápido (upload de contrato pronto) gera um contrato sem modelo
-- vinculado — não faz merge de {placeholders}, só extrai o texto do .docx
-- enviado direto. template_id deixa de ser obrigatório para viabilizar isso.
alter table public.contracts alter column template_id drop not null;
