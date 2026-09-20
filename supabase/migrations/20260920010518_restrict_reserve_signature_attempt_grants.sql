-- O "revoke ... from public" na migration anterior não bastou: novas
-- funções no schema public recebem EXECUTE automaticamente para anon e
-- authenticated via default privileges do projeto — são grants diretos a
-- esses papéis, não ao pseudo-papel PUBLIC, então "revoke from public" não
-- os afeta. reserve_signature_attempt só deve ser chamável pela service
-- role (é a Edge Function assinatura quem chama, com a service key).
revoke execute on function public.reserve_signature_attempt(uuid, int) from anon, authenticated;
