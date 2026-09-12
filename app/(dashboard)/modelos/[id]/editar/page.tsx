import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";
import { getTemplateFileSignedUrl } from "@/lib/storage/templates";
import { EditTemplateForm } from "./EditTemplateForm";
import { TemplateFieldsReview } from "./TemplateFieldsReview";

// O middleware já bloqueia esta rota para perfis júnior; esta checagem
// server-side é a segunda camada de defesa (ex.: chamadas diretas de API).
export default async function EditarModeloPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [{ data: template }, { data: occurrences }] = await Promise.all([
    supabase
      .from("contract_templates")
      .select("id, name, description, contract_type, source_file_path, source_file_name, source_file_size, fields_analyzed_at")
      .eq("id", id)
      .single(),
    supabase
      .from("template_field_occurrences")
      .select("id, occurrence_index, raw_text, context_snippet, role, attribute_key, confidence")
      .eq("template_id", id)
      .order("occurrence_index", { ascending: true }),
  ]);

  if (!template) notFound();

  const fileUrl = template.source_file_path
    ? await getTemplateFileSignedUrl(supabase, template.source_file_path)
    : null;

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div>
        <Link href="/modelos" className="text-xs text-muted hover:text-brand-via">
          ← Modelos
        </Link>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Modelos</p>
        <h1 className="mt-2 font-display text-3xl text-ink_text">Editar modelo</h1>
        <p className="mb-8 mt-2 max-w-lg text-sm text-muted">
          Os mesmos dados do cadastro — altere o que precisar e salve.
        </p>
        <EditTemplateForm
          templateId={template.id}
          name={template.name}
          contractType={template.contract_type}
          description={template.description}
          currentFileName={template.source_file_name}
          currentFileSize={template.source_file_size}
          currentFileUrl={fileUrl}
        />
      </div>

      <TemplateFieldsReview
        templateId={template.id}
        fieldsAnalyzedAt={template.fields_analyzed_at}
        occurrences={(occurrences ?? []).map((o) => ({
          id: o.id,
          occurrenceIndex: o.occurrence_index,
          rawText: o.raw_text,
          contextSnippet: o.context_snippet,
          role: o.role as "contratante" | "contratada" | "especifico",
          attributeKey: o.attribute_key,
          confidence: o.confidence as "high" | "low",
        }))}
      />
    </div>
  );
}
