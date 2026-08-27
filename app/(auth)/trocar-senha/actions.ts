"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/validation/password";

export interface ChangePasswordState {
  error?: string;
}

export async function finishPasswordChange(
  _prevState: ChangePasswordState | undefined,
  formData: FormData
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

  const problems = validatePassword(password, { email: user.email ?? undefined });
  if (problems.length) return { error: problems[0] };

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) return { error: "Não foi possível trocar a senha. Tente novamente." };

  // Redefinir a senha sempre desbloqueia o login (seja troca obrigatória do
  // primeiro acesso, seja pós "esqueci minha senha") — é seguro fazer sempre.
  await supabase.rpc("unlock_member_login", { p_member_id: user.id });
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);

  redirect("/");
}
