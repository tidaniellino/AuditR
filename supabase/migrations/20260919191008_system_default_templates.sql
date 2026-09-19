-- ============================================================================
-- Modelos fixos do sistema: 8 modelos de contrato prontos, disponíveis para
-- TODAS as organizações (não apenas quem os enviou). O arquivo físico é
-- compartilhado (um único objeto em storage por modelo, em
-- contract-templates/_system_master/...), mas cada org recebe sua PRÓPRIA
-- linha em contract_templates (is_system_default = true) — assim cada
-- escritório pode ativar/desativar independentemente, e a análise de campos
-- ([COLCHETES]) roda normalmente pelo mecanismo de auto-análise já existente
-- em generateContract, sem precisar de nenhuma RLS nova nessa tabela.
-- ============================================================================

alter table public.contract_templates
  add column is_system_default boolean not null default false;

-- Leitura do arquivo-mestre compartilhado: qualquer usuário autenticado pode
-- ler objetos sob "_system_master/" (não é uma pasta de org real, então as
-- policies existentes — todas ancoradas em current_org_id() — nunca liberam
-- esse caminho). Sem policy de insert/update/delete: só a service role
-- (que ignora RLS) escreve ali.
create policy "contract_template_files_select_system_master"
on storage.objects for select
using (
  bucket_id = 'contract-templates'
  and (storage.foldername(name))[1] = '_system_master'
);

-- Catálogo dos 8 modelos-mestre (metadados; o arquivo em si vive em storage
-- sob _system_master/). Tabela simples, sem RLS (não é dado sensível de
-- nenhuma org), usada só como fonte para o seed abaixo e o backfill.
create table public.system_default_template_masters (
  slug text primary key,
  name text not null,
  description text not null,
  contract_type text not null,
  source_file_path text not null,
  source_file_name text not null,
  source_file_size bigint not null
);

insert into public.system_default_template_masters
  (slug, name, description, contract_type, source_file_path, source_file_name, source_file_size)
values
  ('contabeis', 'Prestação de Serviços Contábeis', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Serviços Contábeis', '_system_master/01_Contrato_Prestacao_Servicos_Contabeis.docx', '01_Contrato_Prestacao_Servicos_Contabeis.docx', 12510),
  ('juridicos', 'Prestação de Serviços Jurídicos', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Serviços Jurídicos', '_system_master/02_Contrato_Prestacao_Servicos_Juridicos.docx', '02_Contrato_Prestacao_Servicos_Juridicos.docx', 11947),
  ('pj_x_pj', 'PJ x PJ — Sem Vínculo Empregatício', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Prestação de Serviços (PJ x PJ)', '_system_master/03_Contrato_PJ_x_PJ_Sem_Vinculo_Empregaticio.docx', '03_Contrato_PJ_x_PJ_Sem_Vinculo_Empregaticio.docx', 12766),
  ('pj_autonomo', 'PJ Contratando Autônomo', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Prestação de Serviços (Autônomo)', '_system_master/04_Contrato_PJ_Contratando_Autonomo.docx', '04_Contrato_PJ_Contratando_Autonomo.docx', 11778),
  ('locacao_comercial', 'Locação de Imóvel Comercial', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Locação Comercial', '_system_master/06_Contrato_Locacao_Imovel_Comercial.docx', '06_Contrato_Locacao_Imovel_Comercial.docx', 12167),
  ('locacao_residencial', 'Locação de Imóvel Residencial', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Locação Residencial', '_system_master/07_Contrato_Locacao_Imovel_Residencial.docx', '07_Contrato_Locacao_Imovel_Residencial.docx', 11831),
  ('locacao_veiculo', 'Locação de Veículo', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Locação de Veículo', '_system_master/08_Contrato_Locacao_Veiculo.docx', '08_Contrato_Locacao_Veiculo.docx', 11668),
  ('construcao_civil', 'Prestação de Serviços — Construção Civil', 'Modelo padrão do sistema, disponível para todos os escritórios.', 'Serviços de Construção Civil', '_system_master/09_Contrato_Prestacao_Servicos_Construcao_Civil.docx', '09_Contrato_Prestacao_Servicos_Construcao_Civil.docx', 12141);

-- Onboarding: ao criar o PRIMEIRO usuário (sócio) de uma organização nova,
-- semear os 8 modelos fixos junto com o profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_role public.user_role;
  v_invite_token text;
  v_invite public.org_invites;
  v_cpf text;
  v_is_new_org boolean;
begin
  v_org_id := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_invite_token := new.raw_user_meta_data ->> 'invite_token';
  v_cpf := nullif(trim(new.raw_user_meta_data ->> 'cpf'), '');

  if v_org_id is null then
    raise exception 'Cadastro requer uma organização (org_id ausente no metadata)';
  end if;

  select * into v_org from public.organizations where id = v_org_id for update;
  if not found then
    raise exception 'Organização não encontrada';
  end if;

  v_is_new_org := v_org.owner_claimed_at is null;

  if v_is_new_org then
    v_role := 'socio';
    update public.organizations set owner_claimed_at = now() where id = v_org_id;
  else
    v_role := 'funcionario';

    if v_invite_token is not null then
      select * into v_invite
      from public.org_invites
      where token = v_invite_token
        and org_id = v_org_id
        and used_at is null
        and expires_at > now()
        and lower(email) = lower(new.email)
      for update;

      if found then
        v_role := v_invite.role;
        update public.org_invites set used_at = now() where id = v_invite.id;
      end if;
    end if;
  end if;

  insert into public.profiles (id, org_id, full_name, email, role, cpf)
  values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    v_role,
    v_cpf
  );

  if v_is_new_org then
    insert into public.contract_templates
      (org_id, name, description, contract_type, active, created_by, is_system_default,
       source_file_path, source_file_name, source_file_size)
    select
      v_org_id, t.name, t.description, t.contract_type, true, new.id, true,
      t.source_file_path, t.source_file_name, t.source_file_size
    from public.system_default_template_masters t;
  end if;

  return new;
end;
$$;

-- Backfill: organizações que já existiam antes deste modelo de onboarding
-- também recebem os 8 modelos fixos agora (created_by = seu sócio mais
-- antigo, já que created_by é not null).
insert into public.contract_templates
  (org_id, name, description, contract_type, active, created_by, is_system_default,
   source_file_path, source_file_name, source_file_size)
select
  o.id, t.name, t.description, t.contract_type, true, p.id, true,
  t.source_file_path, t.source_file_name, t.source_file_size
from public.organizations o
cross join public.system_default_template_masters t
join lateral (
  select id from public.profiles
  where org_id = o.id
  order by (role = 'socio') desc, created_at asc
  limit 1
) p on true
where not exists (
  select 1 from public.contract_templates ct
  where ct.org_id = o.id and ct.is_system_default = true
);
