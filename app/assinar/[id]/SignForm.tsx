"use client";

import { useFormState } from "react-dom";
import { verifySigningCode, type VerifyState } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

const initialState: VerifyState = {};

export function SignForm({ contractId, signerName }: { contractId: string; signerName: string | null }) {
  const [state, formAction] = useFormState(verifySigningCode, initialState);
  useActionToast(state?.error ? { error: state.error } : undefined);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-seal-tint text-seal">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-display text-2xl text-ink_text">Documento assinado</h2>
        <p className="text-sm text-muted">
          A assinatura eletrônica foi registrada com sucesso. Você já pode fechar esta página.
        </p>
        {state.documentHash && (
          <p className="mt-2 max-w-sm break-all rounded-card border border-edge bg-mist px-3 py-2 font-mono text-[11px] text-muted">
            Hash de validação: {state.documentHash}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-4">
      <input type="hidden" name="contract_id" value={contractId} />
      <p className="text-center text-sm text-muted">
        {signerName ? `Olá, ${signerName}. ` : ""}Digite o código de 6 dígitos enviado para o seu e-mail.
      </p>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        required
        autoComplete="one-time-code"
        placeholder="000000"
        className="w-48 rounded-card border border-edge bg-mist px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-ink_text focus:border-brand-via focus:outline-none focus:ring-2 focus:ring-brand-via/20"
      />
      <SubmitButton pendingLabel="Assinando..." className="w-full">
        Assinar documento
      </SubmitButton>
    </form>
  );
}
