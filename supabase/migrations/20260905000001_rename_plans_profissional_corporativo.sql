-- ============================================================================
-- Renomeia os planos pagos para bater com os produtos reais criados na
-- Stripe: 'basico' -> 'profissional' (R$59,90/mês, 20 contratos/mês) e
-- 'pro' -> 'corporativo' (R$179,90/mês, 150 contratos/mês, até 5 admins).
-- ============================================================================

update public.organizations set plan = 'profissional' where plan = 'basico';
update public.organizations set plan = 'corporativo' where plan = 'pro';

alter table public.organizations
  drop constraint if exists organizations_plan_check,
  add constraint organizations_plan_check check (plan in ('free', 'profissional', 'corporativo'));
