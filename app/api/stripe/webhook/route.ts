import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

function planFromPriceId(priceId: string | undefined): "profissional" | "corporativo" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PROFISSIONAL) return "profissional";
  if (priceId === process.env.STRIPE_PRICE_CORPORATIVO) return "corporativo";
  return null;
}

/** Sincroniza plano/status/período no banco a partir do estado atual da assinatura na Stripe. */
async function syncSubscription(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.org_id;
  if (!orgId) return;

  const item = subscription.items.data[0];
  const plan = planFromPriceId(item?.price?.id) ?? "free";

  const admin = createAdminClient();
  await admin
    .from("organizations")
    .update({
      plan,
      plan_status: subscription.status,
      stripe_subscription_id: subscription.id,
      current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
    })
    .eq("id", orgId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 400 });
  }

  const rawBody = await request.text();

  let stripe: Stripe;
  let event: Stripe.Event;
  try {
    stripe = createStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `invalid_signature: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.org_id;
        if (orgId) {
          const admin = createAdminClient();
          await admin.from("organizations").update({ plan_status: "canceled" }).eq("id", orgId);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Erro ao processar webhook da Stripe:", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
