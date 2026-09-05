"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe/client";
import { createCheckoutSessionUrl } from "@/lib/stripe/checkout";
import { isPaidPlanKey } from "@/lib/stripe/plans";
import { canManageOrg, type UserRole } from "@/lib/auth/permissions";
import { getBaseUrl } from "@/lib/url";

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
  const plan = String(formData.get("plan") ?? "");
  if (!isPaidPlanKey(plan)) failWith("Plano inválido.");

  const { supabase, profile } = await requireOrgManager();

  let stripe;
  try {
    stripe = createStripeClient();
  } catch {
    failWith("Assinaturas não estão configuradas neste ambiente (falta a chave da Stripe).");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .single();

  let checkoutUrl: string;
  try {
    const baseUrl = await getBaseUrl();
    checkoutUrl = await createCheckoutSessionUrl({
      supabase,
      stripe,
      orgId: profile.org_id,
      email: profile.email,
      orgName: org?.name,
      plan,
      baseUrl,
    });
  } catch (error) {
    failWith(error instanceof Error ? error.message : "Não foi possível iniciar o checkout. Tente novamente.");
  }

  redirect(checkoutUrl);
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
