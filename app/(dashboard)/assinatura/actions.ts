"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe/client";
import { canManageOrg, type UserRole } from "@/lib/auth/permissions";
import { getBaseUrl } from "@/lib/url";

const PRICE_IDS: Record<"basico" | "pro", string | undefined> = {
  basico: process.env.STRIPE_PRICE_BASICO,
  pro: process.env.STRIPE_PRICE_PRO,
};

async function requireOrgManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role, email")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Perfil não encontrado");
  if (!canManageOrg(profile.role as UserRole)) redirect("/acesso-negado");

  return { supabase, profile };
}

function failWith(message: string): never {
  redirect(`/assinatura?erro=${encodeURIComponent(message)}`);
}

export async function createCheckoutSession(formData: FormData): Promise<void> {
  const plan = String(formData.get("plan") ?? "") as "basico" | "pro";
  const priceId = PRICE_IDS[plan];

  const { supabase, profile } = await requireOrgManager();

  if (!priceId) {
    failWith(`Plano não configurado neste ambiente (falta STRIPE_PRICE_${plan.toUpperCase()}).`);
  }

  let stripe;
  try {
    stripe = createStripeClient();
  } catch {
    failWith("Assinaturas não estão configuradas neste ambiente (falta a chave da Stripe).");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id, name")
    .eq("id", profile.org_id)
    .single();

  let customerId = org?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: org?.name ?? undefined,
      metadata: { org_id: profile.org_id },
    });
    customerId = customer.id;
    await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", profile.org_id);
  }

  const baseUrl = await getBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/assinatura?sucesso=${encodeURIComponent("Assinatura confirmada!")}`,
    cancel_url: `${baseUrl}/assinatura`,
    metadata: { org_id: profile.org_id },
    subscription_data: { metadata: { org_id: profile.org_id } },
  });

  if (!session.url) failWith("Não foi possível iniciar o checkout. Tente novamente.");

  redirect(session.url);
}

export async function createPortalSession(): Promise<void> {
  const { supabase, profile } = await requireOrgManager();

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", profile.org_id)
    .single();

  if (!org?.stripe_customer_id) failWith("Nenhuma assinatura encontrada para gerenciar.");

  let stripe;
  try {
    stripe = createStripeClient();
  } catch {
    failWith("Assinaturas não estão configuradas neste ambiente (falta a chave da Stripe).");
  }

  const baseUrl = await getBaseUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${baseUrl}/assinatura`,
  });

  redirect(session.url);
}
