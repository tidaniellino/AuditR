import Stripe from "stripe";

/** Client do SDK da Stripe — só uso em Server Actions/Route Handlers. */
export function createStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada — necessária para assinaturas. Veja Developers → API keys no Dashboard da Stripe."
    );
  }
  return new Stripe(secretKey);
}
