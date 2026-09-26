"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { login, type LoginState } from "./actions";
import { signInWithGoogle } from "../oauth-actions";
import { Field, inputClass } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { useActionToast } from "@/components/ui/Toast";
import { GoogleIcon } from "@/components/dashboard/icons";

const initialState: LoginState = {};

// Regra 4: mensagens amigáveis pro retorno do OAuth do Google — nunca expõem
// detalhe técnico (code trocado, identidade não confirmada etc).
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Login com Google cancelado.",
  email_conflict:
    "Não foi possível continuar com essa conta Google. Entre com e-mail e senha ou verifique seu e-mail no Google.",
  "1": "Não foi possível entrar com o Google. Tente novamente.",
};

export function LoginForm({
  redirectTo,
  oauthError,
}: {
  redirectTo: string;
  oauthError?: string;
}) {
  const [state, formAction] = useFormState(login, initialState);
  useActionToast(state);

  const oauthMessage = oauthError ? OAUTH_ERROR_MESSAGES[oauthError] ?? OAUTH_ERROR_MESSAGES["1"] : null;

  return (
    <div className="flex flex-col gap-5">
      {oauthMessage && <Alert tone="error">{oauthMessage}</Alert>}

      {/* Regra 4/6: Google em destaque, acima do formulário. */}
      <form action={signInWithGoogle}>
        <input type="hidden" name="redirect_after" value={redirectTo} />
        <button
          type="submit"
          className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-card border border-edge bg-card px-4 py-2.5 text-sm font-medium text-ink_text transition-colors hover:bg-mist"
        >
          <GoogleIcon />
          Continuar com Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-edge" />
        ou
        <span className="h-px flex-1 bg-edge" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <Field label="E-mail" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={`${inputClass} min-h-[44px]`}
          />
        </Field>

        <Field label="Senha" htmlFor="password">
          <PasswordField id="password" name="password" required autoComplete="current-password" />
        </Field>

        <SubmitButton pendingLabel="Entrando..." className="mt-1 min-h-[44px] w-full">
          Entrar
        </SubmitButton>

        <Link
          href="/esqueci-senha"
          className="text-center text-sm text-muted underline underline-offset-2 hover:text-ink_text"
        >
          Esqueci minha senha
        </Link>
      </form>
    </div>
  );
}
