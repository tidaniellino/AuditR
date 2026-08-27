"use client";

import { useFormState } from "react-dom";
import { sendForSignature, type SendResult } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

const initialState: SendResult = {};

export function SendForSignatureForm({ contractId, label }: { contractId: string; label: string }) {
  const [state, formAction] = useFormState(sendForSignature, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <input type="hidden" name="contract_id" value={contractId} />
      <SubmitButton pendingLabel="Enviando...">{label}</SubmitButton>
    </form>
  );
}
