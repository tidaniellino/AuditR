-- ============================================================================
-- Correção de segurança encontrada em auditoria (2026-09-10):
--
-- addClauseVersion (clausulas/actions.ts) insere em clause_versions com
-- org_id = organização de quem chama, mas clause_id vinha direto do form,
-- sem checar se aquela cláusula pertence à própria organização. A policy
-- clause_versions_insert_editors só validava o org_id da NOVA linha, nunca
-- a organização da cláusula referenciada por clause_id — e o trigger
-- set_clause_version_current() (SECURITY DEFINER, ignora RLS) atualiza
-- clauses.current_version_id incondicionalmente. Resultado: um Sócio da
-- Organização A conseguia, sabendo o UUID de uma cláusula da Organização B,
-- inserir uma "nova versão" apontando para ela e o trigger promovia essa
-- versão a current_version_id da cláusula de B — adulterando o conteúdo de
-- uma cláusula de outra organização, usada nos contratos reais dela.
-- Mesmo problema, menor gravidade, em addIncompatibility: clause_id_a/b não
-- eram checados contra a organização de quem chama.
--
-- Correção em 3 camadas: RLS agora exige que os clause_id referenciados
-- pertençam à organização de quem insere; o trigger SECURITY DEFINER ganha
-- uma checagem redundante (defesa em profundidade, caso outro caminho de
-- escrita apareça no futuro); e o código da aplicação passa a validar antes
-- de tentar o insert, para dar uma mensagem de erro amigável em vez de
-- estourar a constraint do banco.
-- ============================================================================

drop policy "clause_versions_insert_editors" on public.clause_versions;
create policy "clause_versions_insert_editors" on public.clause_versions
  for insert with check (
    org_id = public.current_org_id()
    and public.can_edit_clauses()
    and exists (
      select 1 from public.clauses c where c.id = clause_id and c.org_id = public.current_org_id()
    )
  );

drop policy "clause_incompat_write_editors" on public.clause_incompatibilities;
create policy "clause_incompat_write_editors" on public.clause_incompatibilities
  for all
  using (org_id = public.current_org_id() and public.can_edit_clauses())
  with check (
    org_id = public.current_org_id()
    and public.can_edit_clauses()
    and exists (select 1 from public.clauses c where c.id = clause_id_a and c.org_id = public.current_org_id())
    and exists (select 1 from public.clauses c where c.id = clause_id_b and c.org_id = public.current_org_id())
  );

create or replace function public.set_clause_version_current()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_current then
    if not exists (select 1 from public.clauses where id = new.clause_id and org_id = new.org_id) then
      raise exception 'A cláusula não pertence à organização da nova versão';
    end if;

    update public.clause_versions
      set is_current = false
      where clause_id = new.clause_id and id <> new.id and is_current = true;

    update public.clauses
      set current_version_id = new.id, status = 'approved'
      where id = new.clause_id;
  end if;
  return new;
end;
$$;
