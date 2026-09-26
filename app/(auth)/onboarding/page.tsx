import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { isPaidPlanKey } from "@/lib/stripe/plans";
import { PLAN_LABELS, PLAN_PRICES } from "@/lib/billing/limits";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan = isPaidPlanKey(params.plan ?? "") ? (params.plan as "profissional" | "corporativo") : null;

  return (
    <AuthShell compactHeroOnMobile>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Nova conta</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Criar acesso</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Cadastre sua conta com nome, e-mail e senha.</p>

      {plan && (
        <p className="mb-6 rounded-card border border-brand-via/30 bg-brand-tint px-4 py-3 text-sm text-ink_text">
          Você escolheu o <strong>{PLAN_LABELS[plan]}</strong> (
          {PLAN_PRICES[plan].toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês). Assim
          que a conta for criada, vamos te levar direto pro pagamento.
        </p>
      )}

      <OnboardingForm plan={plan} />

      <p className="mt-6 text-sm text-muted">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-ink_text underline underline-offset-2">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
