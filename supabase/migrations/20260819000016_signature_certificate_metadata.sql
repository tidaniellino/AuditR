-- Metadados do evento de assinatura, para a página de certificação anexada
-- ao PDF final ("Página de Assinatura Eletrônica"): IP, navegador e
-- geolocalização aproximada (best-effort) do signatário no momento em que
-- validou o código OTP.
alter table public.contracts
  add column signer_ip text,
  add column signer_user_agent text,
  add column signer_geolocation text;
