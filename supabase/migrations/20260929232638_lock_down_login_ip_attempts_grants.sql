-- ============================================================================
-- login_ip_attempts já tem RLS ativado sem nenhuma policy, de propósito — só
-- as funções SECURITY DEFINER check_login_ip_rate_limit()/
-- register_login_ip_attempt() (20260920003330) devem tocar essa tabela.
-- Mas os privilégios padrão do Supabase ainda concediam SELECT/INSERT/
-- UPDATE/DELETE/TRUNCATE direto pra anon/authenticated nessa tabela — hoje o
-- "negar tudo" implícito do RLS sem policies é a ÚNICA coisa impedindo
-- acesso direto via API; se alguém um dia criar qualquer policy aqui sem
-- cuidado, a tabela vira gravável por qualquer chamada anônima (dá pra
-- limpar o próprio bloqueio de IP, ou atrapalhar o de outra pessoa).
--
-- Revoga esses privilégios (defesa em profundidade — não depende só do
-- RLS) e adiciona uma policy explícita de negar-tudo, só pra deixar a
-- intenção visível no código em vez de implícita no comportamento do
-- Postgres.
-- ============================================================================

revoke all on public.login_ip_attempts from anon, authenticated;

create policy "no direct access — RPC only"
  on public.login_ip_attempts
  for all
  to anon, authenticated
  using (false);
