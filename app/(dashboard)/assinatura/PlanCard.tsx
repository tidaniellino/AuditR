import { createCheckoutSession } from "./actions";
import { CheckIcon } from "@/components/dashboard/icons";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function PlanCard({
  plan,
  label,
  price,
  features,
  highlighted,
  isCurrent,
  canSubscribe,
}: {
  plan: "profissional" | "corporativo";
  label: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  isCurrent: boolean;
  canSubscribe: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-card p-7 shadow-sm shadow-ink-900/5 ${
        highlighted ? "border-brand-via ring-1 ring-brand-via/30" : "border-edge"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-7 whitespace-nowrap rounded-full bg-brand-via px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-white">
          Mais popular
        </span>
      )}

      <p className="font-display text-xl text-ink_text">{label}</p>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-4xl text-ink_text">
          {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
        <span className="text-sm text-muted">/mês</span>
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-ink_text">
            <CheckIcon className="mt-0.5 shrink-0 text-seal" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-7">
        {isCurrent ? (
          <div className="rounded-card border border-seal/40 bg-seal-tint px-4 py-2.5 text-center text-sm font-medium text-seal">
            Plano atual
          </div>
        ) : canSubscribe ? (
          <form action={createCheckoutSession}>
            <input type="hidden" name="plan" value={plan} />
            <SubmitButton pendingLabel="Redirecionando..." className="w-full justify-center">
              Assinar {label}
            </SubmitButton>
          </form>
        ) : (
          <p className="rounded-card border border-dashed border-edge px-4 py-2.5 text-center text-xs text-muted">
            Peça a um Sócio para assinar
          </p>
        )}
      </div>
    </div>
  );
}
