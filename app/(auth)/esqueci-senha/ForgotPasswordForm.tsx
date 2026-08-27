"use client";

import { useFormState } from "react-dom";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordReset, initialState);

  if (state.submitted) {
    return (
      <Alert tone="success">
        Se esse e-mail estiver cadastrado, enviamos as instruções de redefinição de senha. Confira sua caixa de
        entrada (e o spam).
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="E-mail" htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>

      <SubmitButton pendingLabel="Enviando..." className="mt-1 w-full">
        Enviar instruções
      </SubmitButton>
    </form>
  );
}
