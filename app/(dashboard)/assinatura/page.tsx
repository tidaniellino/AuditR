import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageOrg, type UserRole } from "@/lib/auth/permissions";
import { getContractUsage, PLAN_PRICES } from "@/lib/billing/limits";
import { SearchParamsToast } from "@/components/ui/SearchParamsToast";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PlanCard } from "./PlanCard";
import { createPortalSession } from "./actions";

const PLAN_FEATURES: Record<"basico" | "pro", string[]> = {
  basico: [
    "100 contratos gerados por mês",
    "Assinatura eletrônica com certificado",
    "Biblioteca de cláusulas e modelos",
    "Suporte por e-mail",
  ],
  pro: [
    "300 contratos gerados por mês",
    "Assinatura eletrônica com certificado",
    "Biblioteca de cláusulas e modelos",
    "Envio por WhatsApp",
    "Suporte prioritário",
  ],
};

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile) redirect("/acesso-negado");

  const [{ data: org }, usage] = await Promise.all([
    supabase.from("organizations").select("stripe_customer_id").eq("id", profile.org_id).single(),
    getContractUsage(supabase, profile.org_id),
  ]);

  const canSubscribe = canManageOrg(profile.role as UserRole);
  const usagePct = Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div>
      <SearchParamsToast />
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Conta</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Assinatura</h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        Acompanhe seu uso e escolha o plano ideal para o volume de contratos do seu escritório.
      </p>

      <div className="mt-8 rounded-2xl border border-edge bg-card p-6 shadow-sm shadow-ink-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Plano atual</p>
            <p className="mt-1 font-display text-2xl text-ink_text">{usage.planLabel}</p>
            {usage.isPaidActive && usage.currentPeriodEnd && (
              <p className="mt-1 text-xs text-muted">
                Renova em {new Date(usage.currentPeriodEnd).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          {canSubscribe && org?.stripe_customer_id && (
            <form action={createPortalSession}>
              <SubmitButton pendingLabel="Abrindo..." variant="ghost">
                Gerenciar assinatura
              </SubmitButton>
            </form>
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {usage.used} de {usage.limit} contratos {usage.isPaidActive ? "neste ciclo" : "utilizados"}
            </span>
            <span>{usagePct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist">
            <div
              className={`h-full rounded-full transition-all ${usage.blocked ? "bg-stamp" : "bg-brand-via"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {usage.blocked && (
            <p className="mt-2 text-xs font-medium text-stamp-dim">
              Limite atingido — {usage.isPaidActive ? "faça upgrade" : "assine um plano"} para continuar gerando
              contratos.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <PlanCard
          plan="basico"
          label="Básico"
          price={PLAN_PRICES.basico}
          features={PLAN_FEATURES.basico}
          isCurrent={usage.isPaidActive && usage.plan === "basico"}
          canSubscribe={canSubscribe}
        />
        <PlanCard
          plan="pro"
          label="Pro"
          price={PLAN_PRICES.pro}
          features={PLAN_FEATURES.pro}
          highlighted
          isCurrent={usage.isPaidActive && usage.plan === "pro"}
          canSubscribe={canSubscribe}
        />
      </div>
    </div>
  );
}
