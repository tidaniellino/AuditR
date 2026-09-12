-- ============================================================================
-- Concede o plano "interno" (uso ilimitado de contratos e de sócios/admin)
-- à organização do usuário informado — usado para a conta de testes do
-- próprio dono do sistema, nunca oferecido como opção de compra.
--
-- Como usar: troque o e-mail abaixo se precisar aplicar a outra conta, e
-- rode este script no SQL editor do Supabase (ou via `apply_migration`/
-- `execute_sql` do MCP). É idempotente — pode rodar de novo sem problema.
--
-- Só um script assim (rodado direto no banco, fora da API do PostgREST) ou
-- o webhook da Stripe conseguem mudar organizations.plan — a migration
-- 20260912000004_guard_organization_billing_fields.sql bloqueia qualquer
-- outra tentativa (ex.: um Sócio chamando a API do Supabase diretamente
-- pra tentar setar a própria organização como "interno").
-- ============================================================================

update public.organizations
set plan = 'interno', plan_status = 'active'
where id = (
  select org_id from public.profiles where lower(email) = lower('daniellinocunha@hotmail.com') limit 1
);

-- Confira o resultado:
select o.id, o.name, o.plan, o.plan_status, p.email
from public.organizations o
join public.profiles p on p.org_id = o.id
where lower(p.email) = lower('daniellinocunha@hotmail.com');
