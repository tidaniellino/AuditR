"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAvatarFile, uploadAvatarFile, deleteAvatarFile, MAX_AVATAR_FILE_BYTES } from "@/lib/storage/avatars";
import { hasImageMagicBytes } from "@/lib/storage/file-signatures";

async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, email, avatar_path")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Perfil não encontrado");

  return { supabase, user, profile };
}

export interface ProfileFormState {
  error?: string;
  success?: string;
}

export async function updateProfile(
  _prevState: ProfileFormState | undefined,
  formData: FormData
): Promise<ProfileFormState> {
  const { supabase, user, profile } = await requireProfile();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName) return { error: "Nome é obrigatório." };
  if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };

  const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (profileError) return { error: "Não foi possível salvar o nome." };

  if (email.toLowerCase() !== profile.email.toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) return { error: emailError.message };
    revalidatePath("/perfil");
    return { success: `Nome salvo. Enviamos um link de confirmação para ${email} — o e-mail só muda depois de confirmado.` };
  }

  revalidatePath("/perfil");
  return { success: "Dados salvos." };
}

export interface AvatarFormState {
  error?: string;
}

export async function uploadAvatar(
  _prevState: AvatarFormState | undefined,
  formData: FormData
): Promise<AvatarFormState> {
  const { supabase, user, profile } = await requireProfile();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem." };
  if (file.size > MAX_AVATAR_FILE_BYTES) return { error: "Imagem muito grande (máximo 3 MB)." };
  if (!isAllowedAvatarFile(file)) return { error: "Formato não suportado. Envie .jpg, .png ou .webp." };
  if (!(await hasImageMagicBytes(file))) return { error: "O conteúdo do arquivo não corresponde a uma imagem válida." };

  const uploaded = await uploadAvatarFile(supabase, profile.org_id, user.id, file);
  if ("error" in uploaded) return uploaded;

  const { error } = await supabase.from("profiles").update({ avatar_path: uploaded.path }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar a foto." };

  if (profile.avatar_path) {
    await deleteAvatarFile(supabase, profile.avatar_path);
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return {};
}
