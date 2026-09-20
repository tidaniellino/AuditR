"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resumePendingCheckoutUrl } from "@/lib/stripe/resume-checkout";
import { getBaseUrl } from "@/lib/url";

export interface LoginState {
  error?: string;
}

const LOCK_MESSAGE =
  "Conta bloqueada por excesso de tentativas. Peça a um Sócio para desbloquear ou use \"Esqueci minha senha\".";

/** IP do cliente por trás do proxy da Vercel — x-forwarded-for pode trazer
 *  vários endereços separados por vírgula (proxies intermediários); o
 *  primeiro é o do cliente real. */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function login(_prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  const supabase = await createClient();
  const ip = await getClientIp();

  // Rate limit por IP — protege contra tentativas em massa varrendo vários
  // e-mails diferentes (o bloqueio abaixo é por CONTA, não pega esse caso).
  const { data: ipRateRows } = await supabase.rpc("check_login_ip_rate_limit", { p_ip: ip });
  const ipRate = ipRateRows?.[0];
  if (ipRate?.blocked) {
    const until = ipRate.retry_after
      ? new Date(ipRate.retry_after).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : null;
    return {
      error: until
        ? `Muitas tentativas de login deste endereço. Tente novamente às ${until}.`
        : "Muitas tentativas de login deste endereço. Tente novamente em alguns minutos.",
    };
  }

  const { data: lockoutRows } = await supabase.rpc("check_login_lockout", { p_email: email });
  const lockout = lockoutRows?.[0];

  if (lockout?.blocked) {
    return { error: LOCK_MESSAGE };
  }
  if (lockout?.locked_until && new Date(lockout.locked_until) > new Date()) {
    const until = new Date(lockout.locked_until).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { error: `Muitas tentativas erradas. Tente novamente às ${until}.` };
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
  await Promise.all([
    supabase.rpc("register_login_result", { p_email: email, p_success: !error }),
    supabase.rpc("register_login_ip_attempt", { p_ip: ip, p_success: !error }),
  ]);

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  // Retoma o Checkout da Stripe do plano escolhido no cadastro quando ele não
  // pôde ser aberto na hora (projeto exige confirmação de e-mail antes de dar
  // sessão — ver onboarding/actions.ts e confirmar-conta/route.ts).
  if (signInData.user) {
    const baseUrl = await getBaseUrl();
    const checkoutUrl = await resumePendingCheckoutUrl({
      supabase,
      userId: signInData.user.id,
      email,
      baseUrl,
    });
    if (checkoutUrl) redirect(checkoutUrl);
  }

  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
