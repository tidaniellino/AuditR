"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { createOrganizationAndOwner, type OnboardingState } from "./actions";
import { formatCpfOuCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT } from "@/lib/validation/password";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { useActionToast } from "@/components/ui/Toast";
import { trackMetaPixelEvent } from "@/lib/analytics/meta-pixel";
import { PLAN_PRICES } from "@/lib/billing/limits";

const initialState: OnboardingState = {};

export function OnboardingForm({ plan }: { plan?: "profissional" | "corporativo" | null }) {
  const [state, formAction] = useFormState(createOrganizationAndOwner, initialState);
  useActionToast(state.needsEmailConfirmation ? undefined : state);
  const [cpfCnpj, setCpfCnpj] = useState("");

  // Conta criada com sucesso no banco (organização + usuário) — mesmo que a
  // confirmação de e-mail ainda esteja pendente, este é o momento em que o
  // cadastro passou a existir de fato, então é aqui que o evento de
  // conversão do Meta Pixel deve disparar (nunca antes, e só uma vez).
  // "value" usa o preço do plano escolhido na landing (0 para o plano
  // gratuito) — ainda não é uma cobrança confirmada (isso só acontece no
  // Checkout depois), mas dá pro Meta priorizar por qualidade do cadastro.
  useEffect(() => {
    if (state.needsEmailConfirmation) {
      trackMetaPixelEvent("CompleteRegistration", {
        value: plan ? PLAN_PRICES[plan] : 0,
        currency: "BRL",
      });
    }
  }, [state.needsEmailConfirmation, plan]);

  if (state.needsEmailConfirmation) {
    return (
      <Alert tone={state.emailWarning ? "error" : "success"}>
        {state.emailWarning ? (
          <>Conta criada. {state.emailWarning}</>
        ) : (
          <>
            Conta criada. Enviamos um e-mail de confirmação — clique no link para ativar sua conta e
            fazer login.
          </>
        )}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {plan && <input type="hidden" name="plan" value={plan} />}

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

      <Field label="Senha" htmlFor="password" hint={PASSWORD_POLICY_HINT}>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
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
