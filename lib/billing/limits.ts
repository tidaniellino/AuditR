import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// "interno" não é um plano vendável — nunca aparece em checkout/preços
// (que usam PaidPlanKey, só "profissional"/"corporativo", em lib/stripe/plans.ts).
// É só um marcador manual para contas de teste do próprio time (ver
// scripts/grant-unlimited-plan.sql), sem limite de contratos nem de sócios.
export type PlanKey = "free" | "profissional" | "corporativo" | "interno";

export const PLAN_LIMITS: Record<PlanKey, number> = {
  free: 2,
  profissional: 20,
  corporativo: 150,
  interno: Infinity,
};
/** "Usuários administradores" nas páginas de planos = perfil Sócio (canManageOrg). */
export const PLAN_ADMIN_LIMITS: Record<PlanKey, number> = {
  free: 1,
  profissional: 1,
  corporativo: 5,
  interno: Infinity,
};
export const PLAN_LABELS: Record<PlanKey, string> = {
  free: "Gratuito",
  profissional: "Plano Profissional",
  corporativo: "Plano Corporativo",
  interno: "Uso interno (ilimitado)",
};
export const PLAN_PRICES: Record<"profissional" | "corporativo", number> = {
  profissional: 59.9,
  corporativo: 179.9,
};

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

export interface AdminUsage {
  plan: PlanKey;
  limit: number;
  used: number;
  blocked: boolean;
}

/** Quantos perfis Sócio (= "administrador" nas páginas de planos) a org já tem, contra o limite do plano vigente. */
export async function getAdminUsage(supabase: SupabaseClient<Database>, orgId: string): Promise<AdminUsage> {
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, plan_status")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan as PlanKey) ?? "free";
  const isPaidActive = plan !== "free" && isPlanActive(org?.plan_status ?? "");
  const effectivePlan: PlanKey = isPaidActive ? plan : "free";

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role", "socio")
    .eq("active", true);

  const limit = PLAN_ADMIN_LIMITS[effectivePlan];
  const used = count ?? 0;

  return { plan: effectivePlan, limit, used, blocked: used >= limit };
}
