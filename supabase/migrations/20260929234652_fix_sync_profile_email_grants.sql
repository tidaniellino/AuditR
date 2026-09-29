-- Correção da migration anterior (supabase_advisor_fixes): "revoke ... from
-- public" não basta pra tirar o acesso de anon/authenticated quando o
-- Supabase concedeu EXECUTE direto pra esses roles (privilégio padrão de
-- projeto, separado da concessão implícita via PUBLIC) — mesma pegadinha já
-- vista em outras tabelas/funções deste projeto.
revoke execute on function public.sync_profile_email() from public, anon, authenticated;
