-- ============================================================================
-- Hardening pós-advisor: search_path fixo + restrição de EXECUTE em funções
-- internas (triggers / helpers de RLS) que não devem ser chamadas via RPC
-- público. LGPD/segurança: validate_contract_for_export também ganha checagem
-- de tenant, pois é SECURITY DEFINER e antes não validava org_id do contrato.
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.next_clause_version_number(p_clause_id uuid)
returns text language plpgsql stable set search_path = public as $$
declare
  v_last text;
  v_major int;
  v_minor int;
begin
  select version_number into v_last
  from public.clause_versions
  where clause_id = p_clause_id
  order by created_at desc
  limit 1;

  if v_last is null then
    return 'v1.0';
  end if;

  v_major := split_part(replace(v_last, 'v', ''), '.', 1)::int;
  v_minor := split_part(replace(v_last, 'v', ''), '.', 2)::int;
  return 'v' || v_major || '.' || (v_minor + 1);
end;
$$;

create or replace function public.assign_clause_version_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.version_number is null then
    new.version_number := public.next_clause_version_number(new.clause_id);
  end if;
  return new;
end;
$$;

-- Checagem de tenant: só valida contratos do org do usuário autenticado.
create or replace function public.validate_contract_for_export(p_contract_id uuid)
returns table (is_valid boolean, missing_fields text[], clause_incompatibilities text[])
language plpgsql stable security definer set search_path = public as $$
declare
  v_template_id uuid;
  v_org_id uuid;
  v_missing text[];
  v_incompat text[];
begin
  select template_id, org_id into v_template_id, v_org_id
  from public.contracts where id = p_contract_id;

  if v_org_id is null or v_org_id <> public.current_org_id() then
    raise exception 'Contrato não encontrado ou não pertence à organização do usuário atual';
  end if;

  select coalesce(array_agg(ff.label), '{}') into v_missing
  from public.template_fields tf
  join public.form_fields ff on ff.id = tf.field_id
  where tf.template_id = v_template_id
    and ff.is_required
    and not exists (
      select 1 from public.contract_answers ca
      where ca.contract_id = p_contract_id
        and ca.field_id = ff.id
        and ca.value is not null
        and ca.value::text not in ('null', '""')
    );

  select coalesce(array_agg(distinct ci.reason), '{}') into v_incompat
  from public.contract_clauses cc1
  join public.contract_clauses cc2
    on cc2.contract_id = cc1.contract_id and cc2.clause_id <> cc1.clause_id
  join public.clause_incompatibilities ci
    on ci.clause_id_a = cc1.clause_id and ci.clause_id_b = cc2.clause_id
  where cc1.contract_id = p_contract_id
    and cc1.included and cc2.included
    and ci.severity = 'error';

  return query select
    (coalesce(array_length(v_missing, 1), 0) = 0 and coalesce(array_length(v_incompat, 1), 0) = 0),
    v_missing,
    v_incompat;
end;
$$;

-- Funções que só servem de suporte a trigger / RLS: nunca devem ser
-- chamadas diretamente via /rest/v1/rpc/... por anon ou authenticated.
revoke execute on function public.audit_log_trigger() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_clause_version_current() from public, anon, authenticated;
revoke execute on function public.validate_contract_status_transition() from public, anon, authenticated;
revoke execute on function public.validate_whatsapp_trigger() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.assign_clause_version_number() from public, anon, authenticated;

-- Helpers de RLS/leitura de contexto: úteis para o client autenticado
-- (ex.: checar a própria role), mas sem sentido para anon (não logado).
revoke execute on function public.current_org_id() from anon;
revoke execute on function public.current_user_role() from anon;
revoke execute on function public.can_edit_clauses() from anon;
revoke execute on function public.next_clause_version_number(uuid) from anon;

-- validate_contract_for_export: chamado pelo app antes de exportar; agora
-- protegido por checagem de org_id, mas ainda assim não faz sentido para anon.
revoke execute on function public.validate_contract_for_export(uuid) from anon;
