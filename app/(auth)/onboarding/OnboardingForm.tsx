"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { createOrganizationAndOwner, type OnboardingState } from "./actions";
import { signInWithGoogle } from "../oauth-actions";
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT } from "@/lib/validation/password";
import { Field, inputClass } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { useActionToast } from "@/components/ui/Toast";
import { GoogleIcon } from "@/components/dashboard/icons";
import { trackMetaPixelEvent } from "@/lib/analytics/meta-pixel";
import { trackEvent } from "@/lib/analytics/events";
import { PLAN_PRICES } from "@/lib/billing/limits";

const initialState: OnboardingState = {};

export function OnboardingForm({ plan }: { plan?: "profissional" | "corporativo" | null }) {
  const [state, formAction] = useFormState(createOrganizationAndOwner, initialState);
  useActionToast(state.needsEmailConfirmation ? undefined : state);

  // Regra 7: início do funil de cadastro — dispara uma vez, ao abrir a tela
  // (cobre os dois métodos, já que o botão do Google está na mesma página).
  useEffect(() => {
    trackEvent("signup_started");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conta criada com sucesso no banco (organização + usuário) — mesmo que a
  // confirmação de e-mail ainda esteja pendente, este é o momento em que o
  // cadastro passou a existir de fato, então é aqui que o evento de
  // conversão do Meta Pixel deve disparar (nunca antes, e só uma vez).
  // "value" usa o preço do plano escolhido na landing (0 para o plano
  // gratuito) — ainda não é uma cobrança confirmada (isso só acontece no
  // Checkout depois), mas dá pro Meta priorizar por qualidade do cadastro.
  useEffect(() => {
    if (state.needsEmailConfirmation) {
      trackEvent("signup_completed", { method: "email_senha" });
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
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-4">
        {plan && <input type="hidden" name="plan" value={plan} />}

        {/* Regra 1: só nome, e-mail e senha — sem CPF/CNPJ/telefone aqui. */}
        <Field label="Nome completo" htmlFor="full_name">
          <input
            id="full_name"
            name="full_name"
            required
            autoComplete="name"
            className={`${inputClass} min-h-[44px]`}
          />
        </Field>

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

        <Field label="Senha" htmlFor="password" hint={PASSWORD_POLICY_HINT}>
          <PasswordField
            id="password"
            name="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
          />
        </Field>

        <SubmitButton pendingLabel="Criando..." className="mt-1 min-h-[44px] w-full">
          Criar conta
        </SubmitButton>

        <label className="flex items-start gap-2.5 text-xs text-muted">
          <input type="checkbox" name="accept_terms" required className="mt-0.5 size-4 accent-brand-via" />
          <span>
            Ao continuar, você concorda com os{" "}
            <Link href="/termos" target="_blank" className="underline underline-offset-2 hover:text-ink_text">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="underline underline-offset-2 hover:text-ink_text">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-edge" />
        ou
        <span className="h-px flex-1 bg-edge" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="redirect_after" value="/painel" />
        <button
          type="submit"
          className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-card border border-edge bg-card px-4 py-2.5 text-sm font-medium text-ink_text transition-colors hover:bg-mist"
        >
          <GoogleIcon />
          Continuar com Google
        </button>
      </form>
    </div>
  );
}
