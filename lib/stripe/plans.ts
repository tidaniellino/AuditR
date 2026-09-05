export type PaidPlanKey = "profissional" | "corporativo";

/** Price ID de cada plano pago no Stripe — Products catalog, price recorrente. */
export const STRIPE_PRICE_IDS: Record<PaidPlanKey, string | undefined> = {
  profissional: process.env.STRIPE_PRICE_PROFISSIONAL,
  corporativo: process.env.STRIPE_PRICE_CORPORATIVO,
};

export function isPaidPlanKey(value: string): value is PaidPlanKey {
  return value === "profissional" || value === "corporativo";
}
