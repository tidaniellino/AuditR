import { RescisaoCalculatorForm } from "./RescisaoCalculatorForm";

export default function CalculosPage() {
  return (
    <div>
      <div className="flex flex-wrap items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/calculos/logo.png" alt="" className="size-12 shrink-0 rounded-card" />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Backoffice</p>
          <h1 className="mt-2 font-display text-3xl text-ink_text">Cálculos Trabalhistas</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Estimativa de rescisão — saldo de salário, aviso prévio, férias, 13º, FGTS e descontos.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-card border border-stamp/30 bg-stamp-tint px-4 py-3 text-sm text-stamp-dim">
        <strong>Estimativa, não substitui o cálculo oficial no PJe-Calc.</strong> Use pra ter uma ideia
        rápida do valor — pra protocolar ou homologar, peça ajuda a um contador pelo botão da tela.
      </div>

      <div className="mt-8">
        <RescisaoCalculatorForm />
      </div>
    </div>
  );
}
