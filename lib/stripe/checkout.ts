import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { STRIPE_PRICE_IDS, type PaidPlanKey } from "./plans";

/** Cria (ou reaproveita) o customer da org no Stripe e abre uma sessão de
 *  Checkout para o price do plano — usado tanto na tela de Assinatura quanto
 *  logo após o cadastro, quando o plano já foi escolhido na landing. */
export async function createCheckoutSessionUrl({
  supabase,
  stripe,
  orgId,
  email,
  orgName,
  plan,
  baseUrl,
  successPath = "/assinatura",
  cancelPath = "/assinatura",
}: {
  supabase: SupabaseClient<Database>;
  stripe: Stripe;
  orgId: string;
  email: string | undefined;
  orgName: string | null | undefined;
  plan: PaidPlanKey;
  baseUrl: string;
  successPath?: string;
  cancelPath?: string;
}): Promise<string> {
  const priceId = STRIPE_PRICE_IDS[plan];
  if (!priceId) {
    throw new Error(`Plano não configurado neste ambiente (falta STRIPE_PRICE_${plan.toUpperCase()}).`);
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  let customerId = org?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: orgName ?? undefined,
      metadata: { org_id: orgId },
    });
    customerId = customer.id;
    await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${successPath}?sucesso=${encodeURIComponent("Assinatura confirmada!")}`,
    cancel_url: `${baseUrl}${cancelPath}`,
    metadata: { org_id: orgId },
    subscription_data: { metadata: { org_id: orgId } },
  });

  if (!session.url) throw new Error("Não foi possível iniciar o checkout. Tente novamente.");
  return session.url;
}
