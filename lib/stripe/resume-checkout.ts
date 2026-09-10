import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createStripeClient } from "./client";
import { createCheckoutSessionUrl } from "./checkout";
import { isPaidPlanKey } from "./plans";
import { canManageOrg, type UserRole } from "@/lib/auth/permissions";

/** Retoma o Checkout da Stripe do plano escolhido no cadastro, quando ele não
 *  pôde ser aberto na hora (signup exige confirmação de e-mail antes de dar
 *  sessão). Usado tanto no primeiro login quanto na confirmação de e-mail.
 *  Só se aplica ao Sócio, dono da conta, e só enquanto a organização ainda
 *  não tiver uma assinatura paga. Retorna a URL do Checkout, ou null se não
 *  há plano pendente (ou o usuário não pode gerenciar a organização). */
export async function resumePendingCheckoutUrl({
  supabase,
  userId,
  email,
  baseUrl,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  email: string | undefined;
  baseUrl: string;
}): Promise<string | null> {
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", userId).single();
  if (!profile || !canManageOrg(profile.role as UserRole)) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("name, plan, pending_plan")
    .eq("id", profile.org_id)
    .single();

  if (!org || org.plan !== "free" || !org.pending_plan || !isPaidPlanKey(org.pending_plan)) return null;

  try {
    const stripe = createStripeClient();
    const checkoutUrl = await createCheckoutSessionUrl({
      supabase,
      stripe,
      orgId: profile.org_id,
      email,
      orgName: org.name,
      plan: org.pending_plan,
      baseUrl,
    });

    await supabase.from("organizations").update({ pending_plan: null }).eq("id", profile.org_id);
    return checkoutUrl;
  } catch {
    return null;
  }
}
