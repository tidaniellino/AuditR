"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe/client";
import { createCheckoutSessionUrl } from "@/lib/stripe/checkout";
import { isPaidPlanKey } from "@/lib/stripe/plans";
import { canManageOrg, type UserRole } from "@/lib/auth/permissions";
import { getBaseUrl } from "@/lib/url";

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

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
  await supabase.rpc("register_login_result", { p_email: email, p_success: !error });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  // Retoma o Checkout da Stripe do plano escolhido no cadastro quando ele não
  // pôde ser aberto na hora (projeto exige confirmação de e-mail antes de dar
  // sessão — ver onboarding/actions.ts). Só se aplica ao Sócio, dono da conta,
  // e só enquanto a organização ainda não tiver uma assinatura paga.
  if (signInData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id, role")
      .eq("id", signInData.user.id)
      .single();

    if (profile && canManageOrg(profile.role as UserRole)) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name, plan, pending_plan")
        .eq("id", profile.org_id)
        .single();

      if (org?.plan === "free" && org.pending_plan && isPaidPlanKey(org.pending_plan)) {
        let checkoutUrl: string | null = null;
        try {
          const stripe = createStripeClient();
          const baseUrl = await getBaseUrl();
          checkoutUrl = await createCheckoutSessionUrl({
            supabase,
            stripe,
            orgId: profile.org_id,
            email,
            orgName: org.name,
            plan: org.pending_plan,
            baseUrl,
          });
        } catch {
          checkoutUrl = null;
        }

        if (checkoutUrl) {
          await supabase.from("organizations").update({ pending_plan: null }).eq("id", profile.org_id);
          redirect(checkoutUrl);
        }
      }
    }
  }

  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
