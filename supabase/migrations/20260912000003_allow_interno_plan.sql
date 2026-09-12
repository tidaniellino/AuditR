-- Permite o plano "interno" (uso de testes, ilimitado) em organizations.plan
-- — nunca oferecido para compra, só atribuído manualmente via
-- scripts/grant-unlimited-plan.sql. Ver lib/billing/limits.ts.
alter table public.organizations drop constraint organizations_plan_check;
alter table public.organizations
  add constraint organizations_plan_check
  check (plan = any (array['free'::text, 'profissional'::text, 'corporativo'::text, 'interno'::text]));
