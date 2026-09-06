-- ============================================================================
-- Bug: ao escolher um plano pago na landing e criar a conta, o plano era
-- carregado só como campo de formulário — se o projeto Supabase exige
-- confirmação de e-mail, supabase.auth.signUp() não devolve sessão e o
-- onboarding nunca chega a abrir o Checkout da Stripe. O plano escolhido
-- era perdido: a conta ficava criada, sem cobrança.
--
-- Correção: pending_plan é gravado na organização já na criação (antes do
-- signUp), sobrevivendo à espera da confirmação de e-mail. O primeiro login
-- do Sócio depois disso (em login/actions.ts) confere pending_plan e retoma
-- o Checkout automaticamente. O webhook da Stripe limpa a coluna assim que
-- a assinatura é criada/atualizada, então ela nunca fica "grudada" depois
-- que o pagamento é confirmado por qualquer caminho (onboarding, retomada
-- no login, ou escolha manual em /assinatura).
-- ============================================================================

alter table public.organizations
  add column pending_plan text check (pending_plan in ('profissional', 'corporativo'));

drop function if exists public.create_organization(text, text);

create or replace function public.create_organization(
  p_name text,
  p_cnpj text default null,
  p_pending_plan text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Nome da organização é obrigatório';
  end if;

  if p_pending_plan is not null and p_pending_plan not in ('profissional', 'corporativo') then
    raise exception 'Plano inválido';
  end if;

  insert into public.organizations (name, cnpj, pending_plan)
  values (trim(p_name), nullif(trim(p_cnpj), ''), p_pending_plan)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_organization(text, text, text) from public;
grant execute on function public.create_organization(text, text, text) to anon, authenticated;
