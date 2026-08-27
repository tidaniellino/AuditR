"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidCPF, onlyDigits } from "@/lib/validation/cpf-cnpj";

export interface AcceptInviteState {
  error?: string;
  needsEmailConfirmation?: boolean;
}

export async function acceptInvite(
  _prevState: AcceptInviteState | undefined,
  formData: FormData
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "");
  const orgId = String(formData.get("org_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!token || !orgId || !email) return { error: "Convite inválido." };
  if (!fullName) return { error: "Informe seu nome completo." };
  if (!isValidCPF(cpf)) return { error: "Informe um CPF válido." };
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." };

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { org_id: orgId, full_name: fullName, invite_token: token, cpf },
    },
  });

  if (signUpError) return { error: signUpError.message };

  if (signUpData.session) redirect("/");

  return { needsEmailConfirmation: true };
}
