"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createOrganizationAndOwner, type OnboardingState } from "./actions";
import { formatCpfOuCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initialState: OnboardingState = {};

export function OnboardingForm() {
  const [state, formAction] = useFormState(createOrganizationAndOwner, initialState);
  const [cpfCnpj, setCpfCnpj] = useState("");

  if (state.needsEmailConfirmation) {
    return (
      <Alert tone="success">
        Conta criada. Enviamos um e-mail de confirmação — clique no link para ativar sua conta e fazer
        login.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Nome completo" htmlFor="full_name">
        <input id="full_name" name="full_name" required autoComplete="name" className={inputClass} />
      </Field>

      <Field label="E-mail" htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>

      <Field label="CPF ou CNPJ" htmlFor="cpf_cnpj">
        <input
          id="cpf_cnpj"
          name="cpf_cnpj"
          required
          value={formatCpfOuCnpj(cpfCnpj)}
          onChange={(e) => setCpfCnpj(onlyDigits(e.target.value))}
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
