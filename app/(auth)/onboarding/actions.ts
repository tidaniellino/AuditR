"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const password = String(formData.get("password") ?? "");
  // Regra 1: cadastro mínimo (nome, e-mail, senha) — CPF/CNPJ não é pedido
  // aqui. Fica opcional no banco (organizations.cnpj já era nullable) e só
  // é solicitado quando o usuário tentar gerar o primeiro contrato (ver
  // app/(dashboard)/contratos/actions.ts, gate de "Minha Empresa").
  const acceptedTerms = formData.get("accept_terms") === "on";

  if (!fullName) return { error: "Informe seu nome completo." };
  if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };
  // Front já bloqueia o envio sem marcar (checkbox required), mas a
  // validação precisa ser repetida aqui — o form pode ser submetido direto
  // (fetch/curl) sem passar pela checagem do navegador.
  if (!acceptedTerms) {
    return { error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." };
  }

  const passwordProblems = validatePassword(password, { email });
  if (passwordProblems.length) return { error: passwordProblems[0] };

  // Plano escolhido na landing (?plan=profissional|corporativo), carregado
  // pelo formulário como campo oculto. Gravado na organização desde já (e não
  // só depois do signUp) porque, se o projeto exigir confirmação de e-mail,
  // signUp() não devolve sessão aqui e o Checkout só pode ser retomado no
  // primeiro login (ver login/actions.ts) — o plano não pode se perder nesse meio-tempo.
  const planParam = String(formData.get("plan") ?? "");
  const pendingPlan = isPaidPlanKey(planParam) ? planParam : null;

  const supabase = await createClient();

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Cadastro não está disponível neste ambiente (falta a Service Role Key do Supabase)." };
  }

  // 0) Recusa se o e-mail já tem conta — precisa vir ANTES de criar a
  //    organização. handle_new_user() cria o profile assim que o usuário do
  //    Supabase Auth é inserido, mesmo que o e-mail ainda não tenha sido
  //    confirmado, então checar `profiles` já cobre os dois casos (conta
  //    confirmada e cadastro pendente). Sem essa checagem, reenviar o
  //    formulário com o mesmo e-mail (ex.: usuário que não recebeu o e-mail
  //    de confirmação e tenta de novo) cria uma organização nova a cada
  //    tentativa: generateLink() não recria o usuário do Auth (já existe),
  //    então handle_new_user() nunca roda de novo pra vincular esse profile
  //    à organização nova — ela fica órfã pra sempre, e a tela mostra
  //    "conta criada" (disparando o pixel de conversão) numa tentativa que,
  //    na prática, não criou nada.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile) {
    return {
      error:
        "Já existe uma conta com este e-mail. Se você ainda não confirmou o cadastro, confira sua caixa de entrada — ou faça login e use \"Esqueci minha senha\" se precisar de um novo link.",
    };
  }

  // 1) Cria a "casca" da conta (RPC pública restrita — não expõe dados
  //    sensíveis, só cria a linha em organizations). O usuário ainda não existe.
  //    Sem CNPJ/CPF nesse momento (Regra 1) — a coluna é nullable, preenchida
  //    depois sob demanda.
  const { data: orgId, error: orgError } = await supabase.rpc("create_organization", {
    p_name: fullName,
    p_pending_plan: pendingPlan ?? undefined,
  });

  if (orgError) {
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
  const baseUrl = await getBaseUrl();

  const { data: linkData, error: signUpError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { org_id: orgId, full_name: fullName },
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
