"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidCpfOuCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { createStripeClient } from "@/lib/stripe/client";
import { createCheckoutSessionUrl } from "@/lib/stripe/checkout";
import { isPaidPlanKey } from "@/lib/stripe/plans";
import { getBaseUrl } from "@/lib/url";

export interface OnboardingState {
  error?: string;
  needsEmailConfirmation?: boolean;
}

export async function createOrganizationAndOwner(
  _prevState: OnboardingState | undefined,
  formData: FormData
): Promise<OnboardingState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const cpfCnpj = onlyDigits(String(formData.get("cpf_cnpj") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: "Informe seu nome completo." };
  if (!isValidCpfOuCnpj(cpfCnpj)) return { error: "Informe um CPF ou CNPJ válido." };
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." };

  // Plano escolhido na landing (?plan=profissional|corporativo), carregado
  // pelo formulário como campo oculto. Gravado na organização desde já (e não
  // só depois do signUp) porque, se o projeto exigir confirmação de e-mail,
  // signUp() não devolve sessão aqui e o Checkout só pode ser retomado no
  // primeiro login (ver login/actions.ts) — o plano não pode se perder nesse meio-tempo.
  const planParam = String(formData.get("plan") ?? "");
  const pendingPlan = isPaidPlanKey(planParam) ? planParam : null;

  const supabase = await createClient();

  // 1) Cria a "casca" da conta (RPC pública restrita — não expõe dados
  //    sensíveis, só cria a linha em organizations). O usuário ainda não existe.
  //    O nome interno da conta usa o nome completo — não há mais um "nome de
  //    escritório" separado pedido na tela.
  const { data: orgId, error: orgError } = await supabase.rpc("create_organization", {
    p_name: fullName,
    p_cnpj: cpfCnpj,
    p_pending_plan: pendingPlan ?? undefined,
  });

  if (orgError) {
    if (orgError.code === "23505") {
      return { error: "Já existe uma conta cadastrada com este CPF/CNPJ." };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }
  if (!orgId) {
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // 2) Cria o usuário já vinculado à conta recém-criada. O trigger
  //    handle_new_user() detecta que a conta ainda não tem dono e faz deste
  //    usuário o responsável automaticamente (ver migração 20260819000004).
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { org_id: orgId, full_name: fullName, cpf: cpfCnpj.length === 11 ? cpfCnpj : null },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  if (signUpData.session) {
    // Leva direto pro Checkout do Stripe do plano escolhido assim que a
    // conta é criada (sem precisar esperar a retomada do login).
    if (pendingPlan) {
      let checkoutUrl: string | null = null;
      try {
        const stripe = createStripeClient();
        const baseUrl = await getBaseUrl();
        checkoutUrl = await createCheckoutSessionUrl({
          supabase,
          stripe,
          orgId,
          email,
          orgName: fullName,
          plan: pendingPlan,
          baseUrl,
        });
      } catch {
        checkoutUrl = null;
      }

      if (checkoutUrl) {
        await supabase.from("organizations").update({ pending_plan: null }).eq("id", orgId);
        redirect(checkoutUrl);
      }

      redirect(
        `/assinatura?erro=${encodeURIComponent(
          "Conta criada, mas não foi possível iniciar a assinatura. Tente novamente aqui."
        )}`
      );
    }

    redirect("/painel");
  }

  return { needsEmailConfirmation: true };
}
