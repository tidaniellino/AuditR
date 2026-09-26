import Link from "next/link";
import { CheckIcon } from "@/components/dashboard/icons";
import { PLAN_LIMITS, PLAN_PRICES } from "@/lib/billing/limits";

const PLANS = [
  {
    key: "free",
    label: "Gratuito",
    price: 0,
    description: "Para testar a geração de contratos sem compromisso.",
    features: [
      `${PLAN_LIMITS.free} contratos gerados`,
      "Biblioteca de cláusulas e modelos",
      "Cadastro de clientes PF e PJ",
    ],
    highlighted: false,
  },
  {
    key: "profissional",
    label: "Profissional",
    price: PLAN_PRICES.profissional,
    description: "Para escritórios com fluxo constante de contratos.",
    features: [
      `${PLAN_LIMITS.profissional} contratos gerados por mês`,
      "Armazenamento ilimitado para documentos assinados",
      "Assinatura eletrônica com certificado",
      "Biblioteca de cláusulas e modelos",
      "Suporte por e-mail",
    ],
    highlighted: false,
  },
  {
    key: "corporativo",
    label: "Corporativo",
    price: PLAN_PRICES.corporativo,
    description: "Para escritórios maiores, com times e alto volume.",
    features: [
      `${PLAN_LIMITS.corporativo} contratos gerados por mês`,
      "Até 5 usuários administradores",
      "Assinatura eletrônica com certificado",
      "Biblioteca de cláusulas e modelos",
      "Envio por WhatsApp",
      "Suporte prioritário",
    ],
    highlighted: true,
  },
] as const;

function formatPrice(value: number) {
  if (value === 0) return "Grátis";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function LandingPage() {
  return (
    <div className="bg-audit-grid min-h-screen bg-mist">
      <header className="border-b border-edge bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/imagemmenu.png" alt="AuditR" className="h-8 w-8" />
            <div>
              <p className="font-display text-base leading-none text-ink_text">AuditR</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Contratos</p>
            </div>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-card px-4 py-2 text-sm font-medium text-ink_text hover:text-brand-via"
            >
              Entrar
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
            >
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            SmartDoc Tax
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink_text sm:text-5xl">
            Geração inteligente de contratos
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted">
            Monte cláusulas, gere contratos a partir de modelos e colete assinatura eletrônica —
            tudo em um só lugar, com auditoria de cada etapa.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-card bg-primary px-6 py-3 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
            >
              Começar agora
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-card border border-edge bg-transparent px-6 py-3 text-sm font-medium text-ink_text hover:bg-card"
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Planos</p>
            <h2 className="mt-2 font-display text-3xl text-ink_text">Escolha o plano do seu escritório</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Comece grátis e faça upgrade quando precisar de mais volume — sem fidelidade.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border bg-card p-7 shadow-sm shadow-ink-900/5 ${
                  plan.highlighted ? "border-brand-via ring-1 ring-brand-via/30" : "border-edge"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-brand-via px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-white">
                    Mais popular
                  </span>
                )}

                <p className="font-display text-xl text-ink_text">{plan.label}</p>
                <p className="mt-1 text-sm text-muted">{plan.description}</p>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-ink_text">{formatPrice(plan.price)}</span>
                  {plan.price > 0 && <span className="text-sm text-muted">/mês</span>}
                </p>

                <ul className="mt-6 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-ink_text">
                      <CheckIcon className="mt-0.5 shrink-0 text-seal" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.price === 0 ? "/onboarding" : `/onboarding?plan=${plan.key}`}
                  className={`mt-7 inline-flex items-center justify-center rounded-card px-4 py-2.5 text-center text-sm font-medium transition-all ${
                    plan.highlighted
                      ? "bg-primary text-white shadow-md shadow-brand-via/25 hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
                      : "border border-edge text-ink_text hover:bg-mist"
                  }`}
                >
                  {plan.price === 0 ? "Começar grátis" : `Assinar ${plan.label}`}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-edge px-6 py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} AuditR. Todos os direitos reservados.
      </footer>
    </div>
  );
}
