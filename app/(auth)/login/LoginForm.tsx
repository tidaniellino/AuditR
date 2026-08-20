"use client";

import { useFormState } from "react-dom";
import { login, type LoginState } from "./actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initialState: LoginState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="E-mail" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </Field>

      <Field label="Senha" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>

      <SubmitButton pendingLabel="Entrando..." className="mt-1 w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
