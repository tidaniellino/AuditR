import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";
import { SearchFilterBar } from "@/components/ui/SearchFilterBar";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  approved: "Aprovada",
  deprecated: "Descontinuada",
};

export default async function ClausulasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const { q, status } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isEditor = canEditClauses(profile?.role as UserRole | undefined);

  let clausesQuery = supabase
    .from("clauses")
    .select("id, title, status, clause_type, applicable_contract_types, clause_categories(name)")
    .order("title");

  if (q?.trim()) clausesQuery = clausesQuery.ilike("title", `%${q.trim()}%`);
  if (status === "draft" || status === "approved" || status === "deprecated") {
    clausesQuery = clausesQuery.eq("status", status);
  }

  const { data: clauses } = await clausesQuery;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Biblioteca</p>
          <h1 className="mt-2 font-display text-3xl text-ink_text">Cláusulas</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Cláusulas jurídicas e contábeis padronizadas do escritório, com versionamento e
            validação de incompatibilidades entre si.
          </p>
        </div>
        {isEditor && (
          <Link
            href="/clausulas/novo"
            className="shrink-0 rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
          >
            + Nova cláusula
          </Link>
        )}
      </div>

      <SearchFilterBar
        basePath="/clausulas"
        searchPlaceholder="Buscar por título..."
        currentQuery={q}
        filterParamName="status"
        filterLabel="Todos os status"
        filterOptions={[
          { value: "draft", label: "Rascunho" },
          { value: "approved", label: "Aprovada" },
          { value: "deprecated", label: "Descontinuada" },
        ]}
        currentFilter={status}
      />

      {!clauses?.length ? (
        <div className="rounded-card border border-dashed border-edge bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink_text">
            {q || status ? "Nenhuma cláusula encontrada para essa busca" : "Nenhuma cláusula cadastrada ainda"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {q || status
              ? "Tente ajustar os termos ou limpar os filtros."
              : isEditor
                ? "Cadastre a primeira cláusula-padrão do escritório."
                : "Peça a um Sócio para cadastrar as cláusulas do escritório."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-edge bg-card shadow-sm shadow-ink-900/5">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge bg-mist text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {clauses.map((clause) => {
                const category = (clause.clause_categories as { name: string } | null)?.name;
                return (
                  <tr key={clause.id} className="border-b border-edge last:border-0 hover:bg-mist/60">
                    <td className="px-4 py-3 font-medium text-ink_text">
                      {isEditor ? (
                        <Link href={`/clausulas/${clause.id}/editar`} className="hover:text-brand-via">
                          {clause.title}
                        </Link>
                      ) : (
                        clause.title
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{category ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{clause.clause_type ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                          clause.status === "approved"
                            ? "border-brand-to/40 text-brand-to"
                            : clause.status === "deprecated"
                              ? "border-stamp/40 text-stamp"
                              : "border-edge text-muted"
                        }`}
                      >
                        {STATUS_LABELS[clause.status] ?? clause.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
