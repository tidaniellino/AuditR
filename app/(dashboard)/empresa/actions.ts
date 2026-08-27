"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageOrg, ROLE_LABELS, type UserRole } from "@/lib/auth/permissions";
import { sendInviteEmail } from "@/lib/email/resend";
import { getBaseUrl } from "@/lib/url";

const INVITE_TTL_DAYS = 7;

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

export interface InviteFormState {
  error?: string;
  success?: string;
}

export async function createInvite(
  _prevState: InviteFormState | undefined,
  formData: FormData
): Promise<InviteFormState> {
  const { supabase, user, profile } = await requireOrgManager();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };
  if (!Object.keys(ROLE_LABELS).includes(role)) return { error: "Selecione um perfil válido." };

  const { data: org } = await supabase.from("organizations").select("name").eq("id", profile.org_id).single();

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("org_invites").insert({
    org_id: profile.org_id,
    email,
    role,
    token,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return { error: "Não foi possível gerar o convite." };

  const baseUrl = await getBaseUrl();
  try {
    await sendInviteEmail({
      to: email,
      orgName: org?.name ?? "AuditR Contratos",
      roleLabel: ROLE_LABELS[role],
      inviteUrl: `${baseUrl}/convite/${token}`,
    });
  } catch {
    return { error: "Convite gerado, mas não foi possível enviar o e-mail. Tente reenviar em instantes." };
  }

  revalidatePath("/empresa");
  return { success: `Convite enviado para ${email}.` };
}

export async function toggleMemberActive(memberId: string, nextValue: boolean): Promise<void> {
  const { supabase } = await requireOrgManager();
  await supabase.from("profiles").update({ active: nextValue }).eq("id", memberId);
  revalidatePath("/empresa");
}

export async function updateMemberRole(memberId: string, role: UserRole): Promise<void> {
  const { supabase } = await requireOrgManager();
  await supabase.from("profiles").update({ role }).eq("id", memberId);
  revalidatePath("/empresa");
}
