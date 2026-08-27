"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";

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

function splitContractTypes(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export interface ClauseFormState {
  error?: string;
}

export async function createClause(
  _prevState: ClauseFormState | undefined,
  formData: FormData
): Promise<ClauseFormState> {
  const { supabase, user, profile, allowed } = await requireEditor();
  if (!allowed) return { error: "Apenas Sócio pode criar cláusulas." };

  const title = String(formData.get("title") ?? "").trim();
  const clauseType = String(formData.get("clause_type") ?? "").trim();
  const contractTypesRaw = String(formData.get("applicable_contract_types") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const newCategoryName = String(formData.get("new_category") ?? "").trim();
  let categoryId = String(formData.get("category_id") ?? "").trim() || null;

  if (!title) return { error: "Título da cláusula é obrigatório." };
  if (!content) return { error: "Conteúdo inicial da cláusula é obrigatório." };

  if (!categoryId && newCategoryName) {
    const { data: category, error: categoryError } = await supabase
      .from("clause_categories")
      .insert({ org_id: profile.org_id, name: newCategoryName })
      .select("id")
      .single();

    if (categoryError) {
      if (categoryError.code === "23505") {
        return { error: "Já existe uma categoria com esse nome." };
      }
      return { error: "Não foi possível criar a categoria." };
    }
    categoryId = category.id;
  }

  const { data: clause, error: clauseError } = await supabase
    .from("clauses")
    .insert({
      org_id: profile.org_id,
      category_id: categoryId,
      title,
      clause_type: clauseType || null,
      applicable_contract_types: splitContractTypes(contractTypesRaw),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (clauseError) return { error: "Não foi possível salvar a cláusula." };

  const { error: versionError } = await supabase.from("clause_versions").insert({
    org_id: profile.org_id,
    clause_id: clause.id,
    content,
    change_reason: "Versão inicial",
    changed_by: user.id,
  });

  if (versionError) return { error: "Cláusula criada, mas não foi possível salvar o conteúdo inicial." };

  redirect(`/clausulas/${clause.id}/editar`);
}

export async function updateClauseMeta(
  _prevState: ClauseFormState | undefined,
  formData: FormData
): Promise<ClauseFormState> {
  const { supabase, profile, allowed } = await requireEditor();
  if (!allowed) return { error: "Apenas Sócio pode editar cláusulas." };

  const clauseId = String(formData.get("clause_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const clauseType = String(formData.get("clause_type") ?? "").trim();
  const contractTypesRaw = String(formData.get("applicable_contract_types") ?? "");
  const newCategoryName = String(formData.get("new_category") ?? "").trim();
  let categoryId = String(formData.get("category_id") ?? "").trim() || null;

  if (!clauseId) return { error: "Cláusula não encontrada." };
  if (!title) return { error: "Título da cláusula é obrigatório." };

  if (!categoryId && newCategoryName) {
    const { data: category, error: categoryError } = await supabase
      .from("clause_categories")
      .insert({ org_id: profile.org_id, name: newCategoryName })
      .select("id")
      .single();

    if (categoryError) {
      if (categoryError.code === "23505") {
        return { error: "Já existe uma categoria com esse nome." };
      }
      return { error: "Não foi possível criar a categoria." };
    }
    categoryId = category.id;
  }

  const { error } = await supabase
    .from("clauses")
    .update({
      title,
      category_id: categoryId,
      clause_type: clauseType || null,
      applicable_contract_types: splitContractTypes(contractTypesRaw),
    })
    .eq("id", clauseId);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath(`/clausulas/${clauseId}/editar`);
  return {};
}

export async function addClauseVersion(
  _prevState: ClauseFormState | undefined,
  formData: FormData
): Promise<ClauseFormState> {
  const { supabase, user, profile, allowed } = await requireEditor();
  if (!allowed) return { error: "Apenas Sócio pode criar novas versões." };

  const clauseId = String(formData.get("clause_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const changeReason = String(formData.get("change_reason") ?? "").trim();

  if (!clauseId) return { error: "Cláusula não encontrada." };
  if (!content) return { error: "O conteúdo da nova versão é obrigatório." };
  if (!changeReason) return { error: "Descreva o motivo da alteração." };

  const { error } = await supabase.from("clause_versions").insert({
    org_id: profile.org_id,
    clause_id: clauseId,
    content,
    change_reason: changeReason,
    changed_by: user.id,
  });

  if (error) return { error: "Não foi possível salvar a nova versão." };

  revalidatePath(`/clausulas/${clauseId}/editar`);
  return {};
}

export async function addIncompatibility(formData: FormData) {
  const { supabase, profile, allowed } = await requireEditor();
  if (!allowed) return;

  const clauseId = String(formData.get("clause_id") ?? "");
  const otherClauseId = String(formData.get("other_clause_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const severity = String(formData.get("severity") ?? "error");

  if (!clauseId || !otherClauseId || !reason || clauseId === otherClauseId) {
    return;
  }

  await supabase.from("clause_incompatibilities").insert({
    org_id: profile.org_id,
    clause_id_a: clauseId,
    clause_id_b: otherClauseId,
    reason,
    severity: severity === "warning" ? "warning" : "error",
  });

  revalidatePath(`/clausulas/${clauseId}/editar`);
}

export async function removeIncompatibility(formData: FormData) {
  const { supabase, allowed } = await requireEditor();
  if (!allowed) return;

  const id = String(formData.get("id") ?? "");
  const clauseId = String(formData.get("clause_id") ?? "");
  if (!id) return;

  await supabase.from("clause_incompatibilities").delete().eq("id", id);
  revalidatePath(`/clausulas/${clauseId}/editar`);
}
