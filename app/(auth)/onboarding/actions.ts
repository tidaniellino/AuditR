"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCpfOuCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { validatePassword } from "@/lib/validation/password";
import { isPaidPlanKey } from "@/lib/stripe/plans";
import { getBaseUrl } from "@/lib/url";
import { sendSignupConfirmationEmail } from "@/lib/email/resend";

export interface OnboardingState {
  error?: string;
  needsEmailConfirmation?: boolean;
  /** A conta foi criada, mas o e-mail de confirmação não pôde ser enviado —
   *  diferente de `error` (que significa que NADA foi criado): aqui a conta
   *  já existe, então é um aviso, não uma falha do cadastro em si. */
  emailWarning?: string;
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

  const passwordProblems = validatePassword(password, { email, cpf: cpfCnpj });
  if (passwordProblems.length) return { error: passwordProblems[0] };

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

  // 2) Cria o usuário já vinculado à conta recém-criada e gera o link de
  //    confirmação via admin, sem deixar o Supabase disparar o e-mail nativo
  //    dele — o envio é feito pelo Resend (sendSignupConfirmationEmail), com
  //    o remetente da aplicação. O trigger handle_new_user() detecta que a
  //    conta ainda não tem dono e faz deste usuário o responsável
  //    automaticamente (ver migração 20260819000004). A retomada do plano
  //    escolhido (pending_plan) acontece no primeiro login, depois da
  //    confirmação — ver login/actions.ts.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Cadastro não está disponível neste ambiente (falta a Service Role Key do Supabase)." };
  }

  const baseUrl = await getBaseUrl();

  const { data: linkData, error: signUpError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { org_id: orgId, full_name: fullName, cpf: cpfCnpj.length === 11 ? cpfCnpj : null },
    },
  });

  if (signUpError || !linkData?.properties?.hashed_token) {
    return { error: signUpError?.message ?? "Não foi possível criar o usuário." };
  }

  // A conta (organização + usuário) já existe a partir daqui — o envio do
  // e-mail é só a etapa seguinte. Uma falha no Resend não pode fazer o
  // cadastro parecer que "não aconteceu": além de confundir o usuário
  // (que já tem conta, só precisa reenviar/confirmar depois), isso também
  // suprimia o evento de conversão do Meta Pixel (que só dispara junto com
  // `needsEmailConfirmation`), fazendo cadastros reais saírem sem crédito
  // sempre que o e-mail de confirmação falhasse por qualquer motivo.
  let emailWarning: string | undefined;
  try {
    await sendSignupConfirmationEmail({
      to: email,
      fullName,
      confirmUrl: `${baseUrl}/confirmar-conta?token_hash=${linkData.properties.hashed_token}`,
    });
  } catch {
    emailWarning = "Não foi possível enviar o e-mail de confirmação agora. Tente fazer login mais tarde para reenviá-lo.";
  }

  return { needsEmailConfirmation: true, emailWarning };
}
