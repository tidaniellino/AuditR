"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageOrg, ROLE_LABELS, type UserRole } from "@/lib/auth/permissions";
import { isValidCPF, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { validatePassword } from "@/lib/validation/password";
import { getAdminUsage } from "@/lib/billing/limits";
import {
  isAllowedLetterheadFile,
  MAX_LETTERHEAD_FILE_BYTES,
  uploadLetterheadFile,
  deleteLetterheadFile,
} from "@/lib/storage/letterhead";

const ADMIN_LIMIT_MESSAGE =
  "Limite de usuários Sócio (administrador) do seu plano atingido. Faça upgrade em Assinatura para adicionar mais.";

async function requireOrgManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id, role, full_name").eq("id", user.id).single();
  if (!profile) throw new Error("Perfil não encontrado");
  if (!canManageOrg(profile.role as UserRole)) redirect("/acesso-negado");

  return { supabase, user, profile };
}

export interface OrgFormState {
  error?: string;
}

export async function updateOrganization(
  _prevState: OrgFormState | undefined,
  formData: FormData
): Promise<OrgFormState> {
  const { supabase, profile } = await requireOrgManager();

  const name = String(formData.get("name") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!name) return { error: "Nome da empresa é obrigatório." };

  const endereco = {
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? "") || null,
    bairro: String(formData.get("bairro") ?? ""),
    municipio: String(formData.get("municipio") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    cep: String(formData.get("cep") ?? ""),
  };
  const hasEndereco = Object.values(endereco).some((v) => v);

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      cnpj: cnpj || null,
      email: email || null,
      telefone: telefone || null,
      endereco: hasEndereco ? endereco : null,
    })
    .eq("id", profile.org_id);

  if (error) {
    if (error.code === "23505") return { error: "Já existe uma conta cadastrada com este CNPJ." };
    return { error: "Não foi possível salvar os dados da empresa." };
  }

  revalidatePath("/empresa");
  return {};
}

export interface LetterheadFormState {
  error?: string;
}

export async function uploadLetterhead(
  _prevState: LetterheadFormState | undefined,
  formData: FormData
): Promise<LetterheadFormState> {
  const { supabase, profile } = await requireOrgManager();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo .docx." };
  }
  if (file.size > MAX_LETTERHEAD_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 10 MB)." };
  }
  if (!isAllowedLetterheadFile(file)) {
    return { error: "Formato não suportado. Envie um arquivo .docx." };
  }

  const { data: current } = await supabase
    .from("organizations")
    .select("letterhead_file_path")
    .eq("id", profile.org_id)
    .single();

  const uploaded = await uploadLetterheadFile(supabase, profile.org_id, file);
  if ("error" in uploaded) return { error: uploaded.error };

  const { error } = await supabase
    .from("organizations")
    .update({
      letterhead_file_path: uploaded.path,
      letterhead_file_name: uploaded.name,
      letterhead_file_size: uploaded.size,
    })
    .eq("id", profile.org_id);

  if (error) return { error: "Não foi possível salvar o papel timbrado." };

  if (current?.letterhead_file_path) {
    await deleteLetterheadFile(supabase, current.letterhead_file_path);
  }

  revalidatePath("/empresa");
  return {};
}

export async function removeLetterhead(): Promise<void> {
  const { supabase, profile } = await requireOrgManager();

  const { data: current } = await supabase
    .from("organizations")
    .select("letterhead_file_path")
    .eq("id", profile.org_id)
    .single();

  await supabase
    .from("organizations")
    .update({ letterhead_file_path: null, letterhead_file_name: null, letterhead_file_size: null })
    .eq("id", profile.org_id);

  if (current?.letterhead_file_path) {
    await deleteLetterheadFile(supabase, current.letterhead_file_path);
  }

  revalidatePath("/empresa");
}

export interface MemberFormState {
  error?: string;
  success?: string;
}

export async function createMember(
  _prevState: MemberFormState | undefined,
  formData: FormData
): Promise<MemberFormState> {
  const { supabase, profile } = await requireOrgManager();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!fullName) return { error: "Nome completo é obrigatório." };
  if (!isValidCPF(cpf)) return { error: "CPF inválido." };
  if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };
  if (!Object.keys(ROLE_LABELS).includes(role)) return { error: "Selecione um perfil válido." };
  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

  if (role === "socio") {
    const adminUsage = await getAdminUsage(supabase, profile.org_id);
    if (adminUsage.blocked) return { error: ADMIN_LIMIT_MESSAGE };
  }

  const problems = validatePassword(password, { email, cpf });
  if (problems.length) return { error: problems[0] };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Cadastro direto de usuários não está configurado neste ambiente (falta a Service Role Key do Supabase)." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { org_id: profile.org_id, full_name: fullName },
  });

  if (createError || !created.user) {
    if (createError?.message?.toLowerCase().includes("already")) {
      return { error: "Já existe um usuário cadastrado com esse e-mail." };
    }
    return { error: "Não foi possível criar o usuário." };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role, cpf, must_change_password: true })
    .eq("id", created.user.id);

  if (updateError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível concluir o cadastro do usuário." };
  }

  revalidatePath("/empresa");
  return { success: `Usuário ${fullName} cadastrado com sucesso.` };
}

export async function toggleMemberActive(memberId: string, nextValue: boolean): Promise<void> {
  const { supabase } = await requireOrgManager();
  await supabase.from("profiles").update({ active: nextValue }).eq("id", memberId);
  revalidatePath("/empresa");
}

export async function updateMemberRole(memberId: string, role: UserRole): Promise<{ error?: string }> {
  const { supabase, profile } = await requireOrgManager();

  if (role === "socio") {
    const { data: member } = await supabase.from("profiles").select("role").eq("id", memberId).single();
    if (member?.role !== "socio") {
      const adminUsage = await getAdminUsage(supabase, profile.org_id);
      if (adminUsage.blocked) return { error: ADMIN_LIMIT_MESSAGE };
    }
  }

  await supabase.from("profiles").update({ role }).eq("id", memberId);
  revalidatePath("/empresa");
  return {};
}

export async function unlockMemberLogin(memberId: string): Promise<void> {
  const { supabase } = await requireOrgManager();
  const { error } = await supabase.rpc("unlock_member_login", { p_member_id: memberId });
  if (error) throw new Error(error.message);
  revalidatePath("/empresa");
}

/** Sócio usado como Contratada quando o contrato exige só um signatário
 *  (ex.: o placeholder singular {socio_nome}). Só um por organização — o
 *  índice único no banco garante isso, então limpamos o atual antes de
 *  marcar o novo. */
export async function setDefaultSigner(memberId: string): Promise<{ error?: string }> {
  const { supabase, profile } = await requireOrgManager();

  const { data: member } = await supabase.from("profiles").select("role").eq("id", memberId).single();
  if (member?.role !== "socio") return { error: "Apenas um perfil Sócio pode ser o signatário padrão." };

  await supabase
    .from("profiles")
    .update({ is_default_signer: false })
    .eq("org_id", profile.org_id)
    .eq("is_default_signer", true);

  const { error } = await supabase.from("profiles").update({ is_default_signer: true }).eq("id", memberId);
  if (error) return { error: "Não foi possível definir o signatário padrão." };

  revalidatePath("/empresa");
  return {};
}

export async function clearDefaultSigner(memberId: string): Promise<{ error?: string }> {
  const { supabase } = await requireOrgManager();
  const { error } = await supabase.from("profiles").update({ is_default_signer: false }).eq("id", memberId);
  if (error) return { error: "Não foi possível remover o signatário padrão." };
  revalidatePath("/empresa");
  return {};
}
