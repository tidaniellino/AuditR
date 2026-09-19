import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";
import { SearchParamsToast } from "@/components/ui/SearchParamsToast";
import { PencilIcon } from "@/components/dashboard/icons";
import { toggleTemplateActive } from "./actions";
import { DeleteTemplateButton } from "./DeleteTemplateButton";
import { getTemplateFileSignedUrl, formatFileSize } from "@/lib/storage/templates";

export default async function ModelosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isEditor = canEditClauses(profile?.role as UserRole | undefined);

  const { data: templates } = await supabase
    .from("contract_templates")
    .select(
      "id, name, description, contract_type, active, created_at, source_file_path, source_file_name, source_file_size, is_system_default"
    )
    .order("created_at", { ascending: false });

  const fileUrls = new Map(
    await Promise.all(
      (templates ?? [])
        .filter((t) => t.source_file_path)
        .map(async (t) => [t.id, await getTemplateFileSignedUrl(supabase, t.source_file_path!)] as const)
    )
  );

  return (
    <div>
      <SearchParamsToast />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Modelos</p>
          <h1 className="mt-2 font-display text-3xl text-ink_text">Modelos de contrato</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Cadastre um modelo a partir de um arquivo-modelo (.doc ou .docx) e depois anexe campos do
            formulário dinâmico e cláusulas da biblioteca a ele.
          </p>
        </div>
        {isEditor && (
          <Link
            href="/modelos/novo"
            className="shrink-0 rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
          >
            + Novo modelo
          </Link>
        )}
      </div>

      {!isEditor && (
        <p className="mb-6 text-xs text-muted">
          Criar, editar ou excluir modelos requer uma conta ativa no escritório.
        </p>
      )}

      {!templates?.length ? (
        <div className="rounded-card border border-dashed border-edge bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink_text">Nenhum modelo cadastrado ainda</p>
          <p className="mt-1 text-sm text-muted">
            {isEditor
              ? "Cadastre o primeiro modelo a partir de um arquivo .doc ou .docx."
              : "Peça a um Sócio para cadastrar os modelos do escritório."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-edge bg-card shadow-sm shadow-ink-900/5">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge bg-mist text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Arquivo-modelo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isEditor && <th className="px-4 py-3 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-edge last:border-0 hover:bg-mist/60">
                  <td className="px-4 py-3 font-medium text-ink_text">
                    {isEditor && !t.is_system_default ? (
                      <Link href={`/modelos/${t.id}/editar`} className="hover:text-brand-via">
                        {t.name}
                      </Link>
                    ) : (
                      t.name
                    )}
                    {t.is_system_default && (
                      <span className="ml-2 rounded-full border border-brand-to/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-brand-to">
                        Modelo do sistema
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink_text">{t.contract_type ?? "—"}</td>
                  <td className="px-4 py-3">
                    {t.source_file_path && fileUrls.get(t.id) ? (
                      <a
                        href={fileUrls.get(t.id)!}
                        className="text-brand-via hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.source_file_name ?? "arquivo"}
                        {t.source_file_size ? (
                          <span className="ml-1 text-xs text-muted">({formatFileSize(t.source_file_size)})</span>
                        ) : null}
                      </a>
                    ) : (
                      <span className="text-muted">Sem arquivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditor ? (
                      <form action={toggleTemplateActive}>
                        <input type="hidden" name="template_id" value={t.id} />
                        <input type="hidden" name="next_value" value={(!t.active).toString()} />
                        <button
                          type="submit"
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                            t.active
                              ? "border-brand-to/40 text-brand-to hover:bg-brand-tint"
                              : "border-edge text-muted hover:bg-mist"
                          }`}
                        >
                          {t.active ? "Ativo" : "Inativo"}
                        </button>
                      </form>
                    ) : (
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                          t.active ? "border-brand-to/40 text-brand-to" : "border-edge text-muted"
                        }`}
                      >
                        {t.active ? "Ativo" : "Inativo"}
                      </span>
                    )}
                  </td>
                  {isEditor && (
                    <td className="px-4 py-3">
                      {t.is_system_default ? (
                        <span className="text-xs text-muted">Fixo — não editável</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/modelos/${t.id}/editar`}
                            aria-label="Editar modelo"
                            title="Editar"
                            className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-mist hover:text-brand-via"
                          >
                            <PencilIcon />
                          </Link>
                          <DeleteTemplateButton templateId={t.id} templateName={t.name} />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
