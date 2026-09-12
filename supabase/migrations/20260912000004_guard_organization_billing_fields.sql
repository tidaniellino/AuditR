-- ============================================================================
-- organizations.plan/plan_status (e os dados de período/assinatura da
-- Stripe) só devem mudar via processamento de pagamento (webhook, que usa a
-- service role) — hoje a RLS de update ("org_update_socio") só restringe
-- QUAL linha um Sócio pode alterar, não QUAIS colunas, então qualquer Sócio
-- conseguiria, via API direta do Supabase (fora da tela do sistema), setar
-- a própria organização para qualquer plano, incluindo "interno"
-- (ilimitado, reservado à conta de testes do dono do sistema).
--
-- pending_plan e stripe_customer_id ficam de fora do bloqueio de propósito:
-- são legitimamente escritos por um Sócio autenticado durante o checkout
-- (lib/stripe/checkout.ts, lib/stripe/resume-checkout.ts) — pending_plan já
-- tem seu próprio CHECK restringindo a 'profissional'/'corporativo'.
-- ============================================================================

create or replace function public.guard_organization_billing_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if (
    new.plan is distinct from old.plan
    or new.plan_status is distinct from old.plan_status
    or new.current_period_start is distinct from old.current_period_start
    or new.current_period_end is distinct from old.current_period_end
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
  ) and auth.role() <> 'service_role' then
    raise exception 'Plano, status da assinatura e dados de período só podem ser alterados pelo processamento de pagamento.';
  end if;
  return new;
end;
$$;

create trigger trg_guard_organization_billing_fields before update on public.organizations
  for each row execute function public.guard_organization_billing_fields();
