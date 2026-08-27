import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type PlanKey = "free" | "basico" | "pro";

export const PLAN_LIMITS: Record<PlanKey, number> = { free: 2, basico: 100, pro: 300 };
export const PLAN_LABELS: Record<PlanKey, string> = { free: "Gratuito", basico: "Básico", pro: "Pro" };
export const PLAN_PRICES: Record<"basico" | "pro", number> = { basico: 29.9, pro: 59.9 };

function isPlanActive(status: string): boolean {
  return status === "active" || status === "trialing";
}

export interface ContractUsage {
  plan: PlanKey;
  planLabel: string;
  limit: number;
  used: number;
  blocked: boolean;
  /** Plano pago com assinatura ativa — o limite reseta a cada período de cobrança. */
  isPaidActive: boolean;
  currentPeriodEnd: string | null;
}

/** Uso de contratos da org no ciclo vigente — free é vitalício (nunca reseta), pago conta a partir de current_period_start. */
export async function getContractUsage(
  supabase: SupabaseClient<Database>,
  orgId: string
): Promise<ContractUsage> {
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, plan_status, current_period_start, current_period_end")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan as PlanKey) ?? "free";
  const isPaidActive = plan !== "free" && isPlanActive(org?.plan_status ?? "");

  let query = supabase.from("contracts").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if (isPaidActive && org?.current_period_start) {
    query = query.gte("created_at", org.current_period_start);
  }
  const { count } = await query;

  const effectivePlan: PlanKey = isPaidActive ? plan : "free";
  const limit = PLAN_LIMITS[effectivePlan];
  const used = count ?? 0;

  return {
    plan: effectivePlan,
    planLabel: PLAN_LABELS[effectivePlan],
    limit,
    used,
    blocked: used >= limit,
    isPaidActive,
    currentPeriodEnd: isPaidActive ? (org?.current_period_end ?? null) : null,
  };
}
