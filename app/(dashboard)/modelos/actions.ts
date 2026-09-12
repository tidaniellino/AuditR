"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";
import {
  uploadTemplateFile,
  deleteTemplateFile,
  isAllowedTemplateFile,
  MAX_TEMPLATE_FILE_BYTES,
} from "@/lib/storage/templates";
import { extractDocxParagraphs } from "@/lib/documents/docx";
import { analyzeTemplateFields, type TemplateFieldRole } from "@/lib/documents/template-fields";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

async function requireEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile) throw new Error("Perfil não encontrado");
  if (!canEditClauses(profile.role as UserRole)) {
    return { supabase, user, profile, allowed: false as const };
  }
  return { supabase, user, profile, allowed: true as const };
}

/** Roda a identificação/classificação de campos "[...]" sobre um .docx recém
 *  enviado e salva o resultado junto ao modelo — não repete a análise a cada
 *  contrato gerado a partir dele (só quando o arquivo é substituído, ou sob
 *  pedido explícito via reanalyzeTemplateFields). Silenciosa em qualquer
 *  falha de parsing (ex.: arquivo .doc binário antigo, que a mesma limitação
 *  já existente em generateContract também não processa) — a análise é um
 *  extra, não deve impedir o cadastro do modelo em si. */
async function runTemplateFieldAnalysis(
  supabase: SupabaseClient<Database>,
  orgId: string,
  templateId: string,
  file: File
): Promise<void> {
  await supabase.from("template_field_occurrences").delete().eq("template_id", templateId);

  if (!file.name.toLowerCase().endsWith(".docx")) {
    await supabase.from("contract_templates").update({ fields_analyzed_at: null }).eq("id", templateId);
    return;
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const paragraphs = extractDocxParagraphs(buffer);
    const occurrences = analyzeTemplateFields(paragraphs);

    if (occurrences.length > 0) {
      await supabase.from("template_field_occurrences").insert(
        occurrences.map((o) => ({
          org_id: orgId,
          template_id: templateId,
          occurrence_index: o.occurrenceIndex,
          raw_text: o.rawText,
          paragraph_index: o.paragraphIndex,
          context_snippet: o.contextSnippet,
          role: o.role,
          attribute_key: o.attributeKey,
          confidence: o.confidence,
        }))
      );
    }

    await supabase.from("contract_templates").update({ fields_analyzed_at: new Date().toISOString() }).eq("id", templateId);
  } catch {
    // Arquivo não pôde ser lido como .docx (ex.: corrompido) — não bloqueia
    // o cadastro do modelo, só deixa a análise de campos vazia.
    await supabase.from("contract_templates").update({ fields_analyzed_at: null }).eq("id", templateId);
  }
}

export interface TemplateFormState {
  error?: string;
}

export async function createTemplate(
  _prevState: TemplateFormState | undefined,
  formData: FormData
): Promise<TemplateFormState> {
  const { supabase, user, profile, allowed } = await requireEditor();
  if (!allowed) return { error: "Apenas Sócio pode criar modelos." };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const contractType = String(formData.get("contract_type") ?? "").trim();
  const file = formData.get("file");

  if (!name) return { error: "Nome do modelo é obrigatório." };
  if (!contractType) return { error: "Tipo de contrato é obrigatório." };
  if (!description) return { error: "Descrição é obrigatória." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Envie o arquivo-modelo (.doc ou .docx) que servirá de base para o contrato." };
  }
  if (file.size > MAX_TEMPLATE_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 10 MB)." };
  }
  if (!isAllowedTemplateFile(file)) {
    return { error: "Formato não suportado. Envie um arquivo .doc ou .docx." };
  }

  const { data: template, error } = await supabase
    .from("contract_templates")
    .insert({
      org_id: profile.org_id,
      name,
      description,
      contract_type: contractType,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: "Não foi possível salvar o modelo. Tente novamente." };

  const uploaded = await uploadTemplateFile(supabase, profile.org_id, template.id, file);
  if ("error" in uploaded) {
    await supabase.from("contract_templates").delete().eq("id", template.id);
    return { error: uploaded.error };
  }

  await supabase
    .from("contract_templates")
    .update({
      source_file_path: uploaded.path,
      source_file_name: uploaded.name,
      source_file_size: uploaded.size,
    })
    .eq("id", template.id);

  await runTemplateFieldAnalysis(supabase, profile.org_id, template.id, file);

  redirect(`/modelos/${template.id}/editar`);
}

export async function updateTemplate(
  _prevState: TemplateFormState | undefined,
  formData: FormData
): Promise<TemplateFormState> {
  const { supabase, profile, allowed } = await requireEditor();
  if (!allowed) return { error: "Apenas Sócio pode editar modelos." };

  const templateId = String(formData.get("template_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const contractType = String(formData.get("contract_type") ?? "").trim();
  const file = formData.get("file");

  if (!templateId) return { error: "Modelo não encontrado." };
  if (!name) return { error: "Nome do modelo é obrigatório." };
  if (!contractType) return { error: "Tipo de contrato é obrigatório." };
  if (!description) return { error: "Descrição é obrigatória." };

  const hasNewFile = file instanceof File && file.size > 0;
  if (hasNewFile) {
    if ((file as File).size > MAX_TEMPLATE_FILE_BYTES) {
      return { error: "Arquivo muito grande (máximo 10 MB)." };
    }
    if (!isAllowedTemplateFile(file as File)) {
      return { error: "Formato não suportado. Envie um arquivo .doc ou .docx." };
    }
  }

  const { error } = await supabase
    .from("contract_templates")
    .update({ name, description, contract_type: contractType })
    .eq("id", templateId);

  if (error) return { error: "Não foi possível salvar as alterações." };

  if (hasNewFile) {
    const { data: existing } = await supabase
      .from("contract_templates")
      .select("source_file_path")
      .eq("id", templateId)
      .single();

    const uploaded = await uploadTemplateFile(supabase, profile.org_id, templateId, file as File);
    if ("error" in uploaded) return { error: uploaded.error };

    await supabase
      .from("contract_templates")
      .update({
        source_file_path: uploaded.path,
        source_file_name: uploaded.name,
        source_file_size: uploaded.size,
      })
      .eq("id", templateId);

    await runTemplateFieldAnalysis(supabase, profile.org_id, templateId, file as File);

    if (existing?.source_file_path) {
      await deleteTemplateFile(supabase, existing.source_file_path);
    }
  }

  revalidatePath(`/modelos/${templateId}/editar`);
  redirect(`/modelos?sucesso=${encodeURIComponent(`Modelo "${name}" atualizado.`)}`);
}

export async function toggleTemplateActive(formData: FormData) {
  const { supabase, allowed } = await requireEditor();
  if (!allowed) return;

  const templateId = String(formData.get("template_id") ?? "");
  const nextValue = String(formData.get("next_value") ?? "") === "true";
  if (!templateId) return;

  await supabase.from("contract_templates").update({ active: nextValue }).eq("id", templateId);
  revalidatePath("/modelos");
}

export async function deleteTemplate(formData: FormData) {
  const { supabase, allowed } = await requireEditor();
  const templateId = String(formData.get("template_id") ?? "");

  if (!allowed || !templateId) {
    redirect(`/modelos?erro=${encodeURIComponent("Apenas Sócio pode excluir modelos.")}`);
  }

  const { data: template } = await supabase
    .from("contract_templates")
    .select("source_file_path, name")
    .eq("id", templateId)
    .single();

  const { error } = await supabase.from("contract_templates").delete().eq("id", templateId);

  if (error) {
    const message =
      error.code === "23503"
        ? "Não é possível excluir: este modelo já foi usado em contratos."
        : "Não foi possível excluir o modelo.";
    redirect(`/modelos?erro=${encodeURIComponent(message)}`);
  }

  if (template?.source_file_path) {
    await deleteTemplateFile(supabase, template.source_file_path);
  }

  revalidatePath("/modelos");
  redirect(`/modelos?sucesso=${encodeURIComponent(`Modelo "${template?.name ?? ""}" excluído.`)}`);
}

export interface FieldAnalysisState {
  error?: string;
  success?: string;
}

/** Roda a análise de novo sobre o arquivo já salvo do modelo — útil se o
 *  usuário quiser refazer as sugestões automáticas do zero, descartando
 *  qualquer correção manual feita antes. */
export async function reanalyzeTemplateFields(templateId: string): Promise<FieldAnalysisState> {
  const { supabase, profile, allowed } = await requireEditor();
  if (!allowed) return { error: "Apenas Sócio pode reanalisar modelos." };

  const { data: template } = await supabase
    .from("contract_templates")
    .select("source_file_path, source_file_name")
    .eq("id", templateId)
    .single();

  if (!template?.source_file_path) return { error: "Este modelo não tem arquivo cadastrado." };

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("contract-templates")
    .download(template.source_file_path);

  if (downloadError || !fileBlob) return { error: "Não foi possível ler o arquivo do modelo." };

  const file = new File([fileBlob], template.source_file_name ?? "modelo.docx");
  await runTemplateFieldAnalysis(supabase, profile.org_id, templateId, file);

  revalidatePath(`/modelos/${templateId}/editar`);
  return { success: "Campos reanalisados." };
}

export interface FieldClassificationInput {
  id: string;
  role: TemplateFieldRole;
  attributeKey: string | null;
}

/** Salva as correções manuais feitas na tela de revisão — a classificação
 *  final (automática + ajustes) fica gravada no modelo, sem precisar
 *  repetir a análise a cada contrato gerado a partir dele. */
export async function saveTemplateFieldClassification(
  templateId: string,
  occurrences: FieldClassificationInput[]
): Promise<FieldAnalysisState> {
  const { supabase, allowed } = await requireEditor();
  if (!allowed) return { error: "Apenas Sócio pode editar a classificação de campos." };

  for (const occurrence of occurrences) {
    const { error } = await supabase
      .from("template_field_occurrences")
      .update({ role: occurrence.role, attribute_key: occurrence.attributeKey })
      .eq("id", occurrence.id)
      .eq("template_id", templateId);
    if (error) return { error: "Não foi possível salvar a classificação dos campos." };
  }

  revalidatePath(`/modelos/${templateId}/editar`);
  return { success: "Classificação dos campos salva." };
}
