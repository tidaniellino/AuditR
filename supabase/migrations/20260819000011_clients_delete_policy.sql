-- Faltava uma policy de DELETE para clients (só havia select/insert/update),
-- então excluir cliente era silenciosamente bloqueado pela RLS. Mesmo escopo
-- das demais policies da tabela: qualquer membro da organização.
create policy "clients_delete_org" on public.clients
  for delete using (org_id = public.current_org_id());
