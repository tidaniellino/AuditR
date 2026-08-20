"use client";

import { useFormState } from "react-dom";
import { sendForSignature, type SendResult } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initialState: SendResult = {};

export function SendForSignatureForm({ contractId, label }: { contractId: string; label: string }) {
  const [state, formAction] = useFormState(sendForSignature, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <input type="hidden" name="contract_id" value={contractId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <SubmitButton pendingLabel="Enviando...">{label}</SubmitButton>
    </form>
  );
}
