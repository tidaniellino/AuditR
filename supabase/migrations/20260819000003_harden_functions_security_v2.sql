-- O revoke anterior não bastou: por padrão o Postgres concede EXECUTE ao
-- pseudo-role PUBLIC na criação da função, e anon/authenticated herdam esse
-- grant implícito. É preciso revogar de PUBLIC e conceder explicitamente
-- só a quem deve chamar (authenticated).
revoke execute on function public.current_org_id() from public;
revoke execute on function public.current_user_role() from public;
revoke execute on function public.can_edit_clauses() from public;
revoke execute on function public.next_clause_version_number(uuid) from public;
revoke execute on function public.validate_contract_for_export(uuid) from public;

grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_edit_clauses() to authenticated;
grant execute on function public.next_clause_version_number(uuid) to authenticated;
grant execute on function public.validate_contract_for_export(uuid) to authenticated;
