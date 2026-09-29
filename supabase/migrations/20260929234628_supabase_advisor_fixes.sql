-- ============================================================================
-- Correções dos alertas do Supabase Advisor (security + performance).
-- Cada seção resolve um grupo de findings; nenhuma delas muda o
-- comportamento de acesso já existente — só remove redundância e adiciona
-- índices que faltavam.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) SECURITY: "Public Can Execute SECURITY DEFINER Function"
--
-- Todas as outras 19 funções apontadas pelo advisor já tinham
-- `revoke execute ... from public` explícito (só reabertas pra anon/
-- authenticated de propósito, ex.: check_login_ip_rate_limit, register_login_result,
-- create_organization) — falsos positivos do lint, que não sabe diferenciar
-- "exposta de propósito" de "esquecida aberta". A única exceção real é
-- sync_profile_email(): é uma função de TRIGGER (retorna trigger, usa NEW/OLD),
-- nunca deveria ter sido chamável direto via /rest/v1/rpc/sync_profile_email.
-- ----------------------------------------------------------------------------
revoke execute on function public.sync_profile_email() from public;

-- ----------------------------------------------------------------------------
-- 2) PERFORMANCE: "Auth RLS Initialization Plan"
--
-- auth.uid()/auth.role() dentro de uma policy são reavaliados linha a linha;
-- `(select auth.uid())` deixa o planner tratar como uma subquery com resultado
-- estável, avaliada uma vez só. Sem mudança de comportamento.
-- ----------------------------------------------------------------------------
alter policy "system_default_template_masters_select_authenticated"
  on public.system_default_template_masters
  using ((select auth.role()) = 'authenticated'::text);

-- (profiles_update_self também tinha esse problema — corrigido junto com o
-- merge de policies duplicadas na seção 3, já que as duas coisas afetam a
-- mesma policy.)

-- ----------------------------------------------------------------------------
-- 3) PERFORMANCE: "Multiple Permissive Policies"
--
-- Padrão repetido em 10 tabelas: uma policy "FOR ALL" (org + regra de quem
-- pode editar) e uma policy "FOR SELECT" (só org) — como toda leitura já é
-- coberta pela condição mais ampla da policy de SELECT, a de ALL era
-- redundante nesse caso (Postgres teria que avaliar as duas em toda leitura).
-- CREATE POLICY não aceita uma lista de comandos num "FOR" só, então a policy
-- de escrita vira 3 policies (INSERT/UPDATE/DELETE) com a MESMA condição —
-- fica mais policies, mas cada ação passa a ter exatamente uma aplicável.
--
-- profiles é o único caso de duplicidade de verdade (duas policies de UPDATE
-- com regras diferentes, não superset uma da outra) — aqui sim dá pra
-- combinar num OR, numa única policy.
-- ----------------------------------------------------------------------------

-- profiles: junta profiles_update_self + profiles_update_org_managers.
drop policy "profiles_update_org_managers" on public.profiles;
alter policy "profiles_update_self" on public.profiles
  using (
    (id = (select auth.uid()))
    or ((org_id = current_org_id()) and (current_user_role() = 'socio'::user_role))
  )
  with check (
    (id = (select auth.uid()))
    or (org_id = current_org_id())
  );

-- clause_categories
drop policy "clause_categories_write_editors" on public.clause_categories;
create policy "clause_categories_write_editors" on public.clause_categories
  for insert
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "clause_categories_update_editors" on public.clause_categories
  for update
  using ((org_id = current_org_id()) and can_edit_clauses())
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "clause_categories_delete_editors" on public.clause_categories
  for delete
  using ((org_id = current_org_id()) and can_edit_clauses());

-- clause_incompatibilities
drop policy "clause_incompat_write_editors" on public.clause_incompatibilities;
create policy "clause_incompat_insert_editors" on public.clause_incompatibilities
  for insert
  with check (
    (org_id = current_org_id()) and can_edit_clauses()
    and (exists (select 1 from clauses c where c.id = clause_incompatibilities.clause_id_a and c.org_id = current_org_id()))
    and (exists (select 1 from clauses c where c.id = clause_incompatibilities.clause_id_b and c.org_id = current_org_id()))
  );
create policy "clause_incompat_update_editors" on public.clause_incompatibilities
  for update
  using ((org_id = current_org_id()) and can_edit_clauses())
  with check (
    (org_id = current_org_id()) and can_edit_clauses()
    and (exists (select 1 from clauses c where c.id = clause_incompatibilities.clause_id_a and c.org_id = current_org_id()))
    and (exists (select 1 from clauses c where c.id = clause_incompatibilities.clause_id_b and c.org_id = current_org_id()))
  );
create policy "clause_incompat_delete_editors" on public.clause_incompatibilities
  for delete
  using ((org_id = current_org_id()) and can_edit_clauses());

-- company_partners
drop policy "company_partners_write_socio" on public.company_partners;
create policy "company_partners_insert_socio" on public.company_partners
  for insert
  with check ((org_id = current_org_id()) and (current_user_role() = any (array['socio'::user_role, 'admin'::user_role])));
create policy "company_partners_update_socio" on public.company_partners
  for update
  using ((org_id = current_org_id()) and (current_user_role() = any (array['socio'::user_role, 'admin'::user_role])))
  with check ((org_id = current_org_id()) and (current_user_role() = any (array['socio'::user_role, 'admin'::user_role])));
create policy "company_partners_delete_socio" on public.company_partners
  for delete
  using ((org_id = current_org_id()) and (current_user_role() = any (array['socio'::user_role, 'admin'::user_role])));

-- contract_answers
drop policy "contract_answers_write_org" on public.contract_answers;
create policy "contract_answers_insert_org" on public.contract_answers
  for insert
  with check (org_id = current_org_id());
create policy "contract_answers_update_org" on public.contract_answers
  for update
  using (org_id = current_org_id())
  with check (org_id = current_org_id());
create policy "contract_answers_delete_org" on public.contract_answers
  for delete
  using (org_id = current_org_id());

-- contract_clauses
drop policy "contract_clauses_write_org" on public.contract_clauses;
create policy "contract_clauses_insert_org" on public.contract_clauses
  for insert
  with check (org_id = current_org_id());
create policy "contract_clauses_update_org" on public.contract_clauses
  for update
  using (org_id = current_org_id())
  with check (org_id = current_org_id());
create policy "contract_clauses_delete_org" on public.contract_clauses
  for delete
  using (org_id = current_org_id());

-- contract_templates
drop policy "contract_templates_write_editors" on public.contract_templates;
create policy "contract_templates_insert_editors" on public.contract_templates
  for insert
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "contract_templates_update_editors" on public.contract_templates
  for update
  using ((org_id = current_org_id()) and can_edit_clauses())
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "contract_templates_delete_editors" on public.contract_templates
  for delete
  using ((org_id = current_org_id()) and can_edit_clauses());

-- form_fields
drop policy "form_fields_write_editors" on public.form_fields;
create policy "form_fields_insert_editors" on public.form_fields
  for insert
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "form_fields_update_editors" on public.form_fields
  for update
  using ((org_id = current_org_id()) and can_edit_clauses())
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "form_fields_delete_editors" on public.form_fields
  for delete
  using ((org_id = current_org_id()) and can_edit_clauses());

-- template_clauses
drop policy "template_clauses_write_editors" on public.template_clauses;
create policy "template_clauses_insert_editors" on public.template_clauses
  for insert
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "template_clauses_update_editors" on public.template_clauses
  for update
  using ((org_id = current_org_id()) and can_edit_clauses())
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "template_clauses_delete_editors" on public.template_clauses
  for delete
  using ((org_id = current_org_id()) and can_edit_clauses());

-- template_field_occurrences
drop policy "template_field_occurrences_write_org" on public.template_field_occurrences;
create policy "template_field_occurrences_insert_org" on public.template_field_occurrences
  for insert
  with check (
    (org_id = current_org_id())
    and (exists (select 1 from contract_templates t where t.id = template_field_occurrences.template_id and t.org_id = current_org_id()))
  );
create policy "template_field_occurrences_update_org" on public.template_field_occurrences
  for update
  using (
    (org_id = current_org_id())
    and (exists (select 1 from contract_templates t where t.id = template_field_occurrences.template_id and t.org_id = current_org_id()))
  )
  with check (
    (org_id = current_org_id())
    and (exists (select 1 from contract_templates t where t.id = template_field_occurrences.template_id and t.org_id = current_org_id()))
  );
create policy "template_field_occurrences_delete_org" on public.template_field_occurrences
  for delete
  using (
    (org_id = current_org_id())
    and (exists (select 1 from contract_templates t where t.id = template_field_occurrences.template_id and t.org_id = current_org_id()))
  );

-- template_fields
drop policy "template_fields_write_editors" on public.template_fields;
create policy "template_fields_insert_editors" on public.template_fields
  for insert
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "template_fields_update_editors" on public.template_fields
  for update
  using ((org_id = current_org_id()) and can_edit_clauses())
  with check ((org_id = current_org_id()) and can_edit_clauses());
create policy "template_fields_delete_editors" on public.template_fields
  for delete
  using ((org_id = current_org_id()) and can_edit_clauses());

-- ----------------------------------------------------------------------------
-- 4) PERFORMANCE: "Unindexed foreign keys" (41 ocorrências)
-- ----------------------------------------------------------------------------
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_clause_incompatibilities_clause_id_a on public.clause_incompatibilities(clause_id_a);
create index if not exists idx_clause_incompatibilities_clause_id_b on public.clause_incompatibilities(clause_id_b);
create index if not exists idx_clause_incompatibilities_org_id on public.clause_incompatibilities(org_id);
create index if not exists idx_clause_versions_changed_by on public.clause_versions(changed_by);
create index if not exists idx_clause_versions_org_id on public.clause_versions(org_id);
create index if not exists idx_clauses_category_id on public.clauses(category_id);
create index if not exists idx_clauses_created_by on public.clauses(created_by);
create index if not exists idx_clauses_current_version_id on public.clauses(current_version_id);
create index if not exists idx_client_representatives_created_by on public.client_representatives(created_by);
create index if not exists idx_client_representatives_org_id on public.client_representatives(org_id);
create index if not exists idx_clients_created_by on public.clients(created_by);
create index if not exists idx_company_partners_created_by on public.company_partners(created_by);
create index if not exists idx_contract_answers_field_id on public.contract_answers(field_id);
create index if not exists idx_contract_answers_org_id on public.contract_answers(org_id);
create index if not exists idx_contract_clauses_clause_id on public.contract_clauses(clause_id);
create index if not exists idx_contract_clauses_clause_version_id on public.contract_clauses(clause_version_id);
create index if not exists idx_contract_clauses_contract_id on public.contract_clauses(contract_id);
create index if not exists idx_contract_clauses_org_id on public.contract_clauses(org_id);
create index if not exists idx_contract_status_history_changed_by on public.contract_status_history(changed_by);
create index if not exists idx_contract_status_history_contract_id on public.contract_status_history(contract_id);
create index if not exists idx_contract_status_history_org_id on public.contract_status_history(org_id);
create index if not exists idx_contract_templates_created_by on public.contract_templates(created_by);
create index if not exists idx_contract_templates_org_id on public.contract_templates(org_id);
create index if not exists idx_contracts_client_id on public.contracts(client_id);
create index if not exists idx_contracts_created_by on public.contracts(created_by);
create index if not exists idx_contracts_template_id on public.contracts(template_id);
create index if not exists idx_org_invites_created_by on public.org_invites(created_by);
create index if not exists idx_signature_audit_logs_org_id on public.signature_audit_logs(org_id);
create index if not exists idx_signature_codes_org_id on public.signature_codes(org_id);
create index if not exists idx_signature_requests_contract_id on public.signature_requests(contract_id);
create index if not exists idx_signature_requests_org_id on public.signature_requests(org_id);
create index if not exists idx_template_clauses_clause_id on public.template_clauses(clause_id);
create index if not exists idx_template_clauses_org_id on public.template_clauses(org_id);
create index if not exists idx_template_field_occurrences_org_id on public.template_field_occurrences(org_id);
create index if not exists idx_template_fields_field_id on public.template_fields(field_id);
create index if not exists idx_template_fields_org_id on public.template_fields(org_id);
create index if not exists idx_whatsapp_notifications_client_id on public.whatsapp_notifications(client_id);
create index if not exists idx_whatsapp_notifications_contract_id on public.whatsapp_notifications(contract_id);
create index if not exists idx_whatsapp_notifications_org_id on public.whatsapp_notifications(org_id);
create index if not exists idx_whatsapp_notifications_triggered_by on public.whatsapp_notifications(triggered_by);
