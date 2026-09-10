"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { getBaseUrl } from "@/lib/url";

export interface ForgotPasswordState {
  submitted?: boolean;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (email) {
    try {
      const admin = createAdminClient();
      const baseUrl = await getBaseUrl();
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });

      if (!error && data?.properties?.hashed_token) {
        await sendPasswordResetEmail({
          to: email,
          resetUrl: `${baseUrl}/redefinir-senha?token_hash=${data.properties.hashed_token}`,
        });
      }
    } catch {
      // Falha silenciosa de propósito: a resposta nunca revela se o e-mail existe ou se o envio falhou.
    }
  }

  // Sempre a mesma resposta, exista ou não o e-mail — evita enumeração de usuários.
  return { submitted: true };
}
