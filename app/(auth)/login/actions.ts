"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

const LOCK_MESSAGE =
  "Conta bloqueada por excesso de tentativas. Peça a um Sócio para desbloquear ou use \"Esqueci minha senha\".";

export async function login(_prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  const supabase = await createClient();

  const { data: lockoutRows } = await supabase.rpc("check_login_lockout", { p_email: email });
  const lockout = lockoutRows?.[0];

  if (lockout?.blocked) {
    return { error: LOCK_MESSAGE };
  }
  if (lockout?.locked_until && new Date(lockout.locked_until) > new Date()) {
    const until = new Date(lockout.locked_until).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { error: `Muitas tentativas erradas. Tente novamente às ${until}.` };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  await supabase.rpc("register_login_result", { p_email: email, p_success: !error });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
