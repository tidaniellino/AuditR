"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { acceptInvite, type AcceptInviteState } from "./actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { formatCPF, onlyDigits } from "@/lib/validation/cpf-cnpj";

const initialState: AcceptInviteState = {};

export function AcceptInviteForm({ token, orgId, email }: { token: string; orgId: string; email: string }) {
  const [state, formAction] = useFormState(acceptInvite, initialState);
  const [cpf, setCpf] = useState("");

  if (state.needsEmailConfirmation) {
    return (
      <Alert tone="success">
        Conta criada. Enviamos um e-mail de confirmação para {email} — clique no link para ativar sua conta e
        fazer login.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="email" value={email} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="E-mail" htmlFor="email_display">
        <input id="email_display" value={email} disabled className={`${inputClass} opacity-70`} />
      </Field>

      <Field label="Nome completo" htmlFor="full_name">
        <input id="full_name" name="full_name" required autoComplete="name" className={inputClass} />
      </Field>

      <Field label="CPF" htmlFor="cpf">
        <input
          id="cpf"
          name="cpf"
          required
          value={formatCPF(cpf)}
          onChange={(e) => setCpf(onlyDigits(e.target.value))}
          className={inputClass}
        />
      </Field>

      <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>

      <SubmitButton pendingLabel="Criando..." className="mt-1 w-full">
        Criar acesso
      </SubmitButton>
    </form>
  );
}
