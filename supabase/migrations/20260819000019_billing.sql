-- ============================================================================
-- Assinatura paga via Stripe. Toda organização começa em 'free' (2 contratos
-- vitalícios, sem reset). Planos pagos (renomeados em
-- 20260905000001_rename_plans_profissional_corporativo.sql para
-- 'profissional'/'corporativo') têm limite mensal, controlado pelo período
-- de cobrança da assinatura Stripe (current_period_start/end, sincronizados
-- via webhook).
-- ============================================================================

alter table public.organizations
  add column plan text not null default 'free' check (plan in ('free', 'basico', 'pro')),
  add column plan_status text not null default 'inactive',
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column current_period_start timestamptz,
  add column current_period_end timestamptz;

create index idx_organizations_stripe_customer on public.organizations (stripe_customer_id);
