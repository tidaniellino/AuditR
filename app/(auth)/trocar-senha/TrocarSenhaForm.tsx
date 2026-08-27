"use client";

import { useFormState } from "react-dom";
import { finishPasswordChange, type ChangePasswordState } from "./actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";
import { PASSWORD_POLICY_HINT } from "@/lib/validation/password";

const initialState: ChangePasswordState = {};

export function TrocarSenhaForm() {
  const [state, formAction] = useFormState(finishPasswordChange, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Nova senha" htmlFor="password" hint={PASSWORD_POLICY_HINT}>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>

      <Field label="Confirmar nova senha" htmlFor="confirm_password">
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>

      <SubmitButton pendingLabel="Salvando..." className="mt-1 w-full">
        Trocar senha e continuar
      </SubmitButton>
    </form>
  );
}
