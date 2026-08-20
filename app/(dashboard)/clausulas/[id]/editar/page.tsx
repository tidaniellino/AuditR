import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";
import { ClauseMetaForm } from "./ClauseMetaForm";
import { NewVersionForm } from "./NewVersionForm";
import { addIncompatibility, removeIncompatibility } from "../../actions";

const SEVERITY_LABELS: Record<string, string> = { error: "Bloqueante", warning: "Alerta" };

// O middleware já bloqueia esta rota para perfis júnior; esta checagem
// server-side é a segunda camada de defesa (ex.: chamadas diretas de API).
export default async function EditarClausulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canEditClauses(profile?.role as UserRole | undefined)) {
    redirect("/acesso-negado");
  }

  const { data: clause } = await supabase
    .from("clauses")
    .select(
      "id, title, category_id, clause_type, applicable_contract_types, clause_versions!clause_versions_clause_id_fkey(id, content, version_number, change_reason, is_current, created_at)"
    )
    .eq("id", id)
    .single();

  if (!clause) notFound();

  const { data: categories } = await supabase
    .from("clause_categories")
    .select("id, name")
    .order("name");

  const { data: otherClauses } = await supabase
    .from("clauses")
    .select("id, title")
    .neq("id", id)
    .order("title");

  const { data: rawIncompatibilities } = await supabase
    .from("clause_incompatibilities")
    .select("id, clause_id_a, clause_id_b, reason, severity")
    .or(`clause_id_a.eq.${id},clause_id_b.eq.${id}`);

  const otherIds = (rawIncompatibilities ?? []).map((i) => (i.clause_id_a === id ? i.clause_id_b : i.clause_id_a));
  const { data: relatedClauses } =
    otherIds.length > 0
      ? await supabase.from("clauses").select("id, title").in("id", otherIds)
      : { data: [] as { id: string; title: string }[] };
  const titleById = new Map((relatedClauses ?? []).map((c) => [c.id, c.title]));

  const versions = [...(clause.clause_versions ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const current = versions.find((v) => v.is_current) ?? versions[0];

  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Biblioteca</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Editar cláusula</h1>

      <section className="mt-8 rounded-card border border-edge bg-white p-6 shadow-sm shadow-ink-900/5">
        <h2 className="mb-4 text-sm font-medium text-ink_text">Dados gerais</h2>
        <ClauseMetaForm
          clauseId={clause.id}
          title={clause.title}
          categoryId={clause.category_id}
          clauseType={clause.clause_type}
          applicableContractTypes={clause.applicable_contract_types ?? []}
          categories={categories ?? []}
        />
      </section>

      <section className="mt-6 rounded-card border border-edge bg-white p-6 shadow-sm shadow-ink-900/5">
        <h2 className="mb-4 text-sm font-medium text-ink_text">Nova versão do conteúdo</h2>
        <NewVersionForm clauseId={clause.id} currentContent={current?.content ?? ""} />
      </section>

      <section className="mt-6 rounded-card border border-edge bg-white p-6 shadow-sm shadow-ink-900/5">
        <h2 className="mb-4 text-sm font-medium text-ink_text">Histórico de versões</h2>
        <div className="flex flex-col divide-y divide-edge">
          {versions.map((v) => (
            <div key={v.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-mono text-xs text-ink_text">{v.version_number}</p>
                <p className="mt-0.5 text-sm text-muted">{v.change_reason ?? "—"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {v.is_current && (
                  <span className="rounded-full border border-brand-to/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-brand-to">
                    Vigente
                  </span>
                )}
                <span className="text-xs text-muted">{new Date(v.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-card border border-edge bg-white p-6 shadow-sm shadow-ink-900/5">
        <h2 className="text-sm font-medium text-ink_text">Incompatibilidades</h2>
        <p className="mt-1 text-xs text-muted">
          Usadas na validação cruzada antes da exportação do contrato (ex.: foro cível x arbitragem).
        </p>

        <div className="mt-4 flex flex-col divide-y divide-edge">
          {(rawIncompatibilities ?? []).map((inc) => {
            const otherId = inc.clause_id_a === id ? inc.clause_id_b : inc.clause_id_a;
            return (
              <div key={inc.id} className="flex items-center justify-between gap-4 py-2.5">
                <div>
                  <p className="text-sm text-ink_text">{titleById.get(otherId) ?? "Cláusula"}</p>
                  <p className="text-xs text-muted">{inc.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                      inc.severity === "error" ? "border-stamp/40 text-stamp" : "border-edge text-muted"
                    }`}
                  >
                    {SEVERITY_LABELS[inc.severity] ?? inc.severity}
                  </span>
                  <form action={removeIncompatibility}>
                    <input type="hidden" name="id" value={inc.id} />
                    <input type="hidden" name="clause_id" value={id} />
                    <button type="submit" className="text-xs text-muted hover:text-stamp">
                      Remover
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {(rawIncompatibilities ?? []).length === 0 && (
            <p className="py-2.5 text-sm text-muted">Nenhuma incompatibilidade declarada.</p>
          )}
        </div>

        <form action={addIncompatibility} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="clause_id" value={id} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="other_clause_id" className="text-xs font-medium text-ink_text">
              Incompatível com
            </label>
            <select
              id="other_clause_id"
              name="other_clause_id"
              required
              className="rounded-card border border-edge bg-mist px-3 py-2 text-sm text-ink_text focus:border-brand-via focus:outline-none focus:ring-2 focus:ring-brand-via/20"
            >
              <option value="">— Selecionar —</option>
              {(otherClauses ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reason" className="text-xs font-medium text-ink_text">
              Motivo
            </label>
            <input
              id="reason"
              name="reason"
              required
              className="rounded-card border border-edge bg-mist px-3 py-2 text-sm text-ink_text focus:border-brand-via focus:outline-none focus:ring-2 focus:ring-brand-via/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="severity" className="text-xs font-medium text-ink_text">
              Severidade
            </label>
            <select
              id="severity"
              name="severity"
              defaultValue="error"
              className="rounded-card border border-edge bg-mist px-3 py-2 text-sm text-ink_text focus:border-brand-via focus:outline-none focus:ring-2 focus:ring-brand-via/20"
            >
              <option value="error">Bloqueante</option>
              <option value="warning">Alerta</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-card border border-edge bg-transparent px-4 py-2 text-sm font-medium text-ink_text transition-colors hover:bg-mist"
          >
            Adicionar
          </button>
        </form>
      </section>
    </div>
  );
}
