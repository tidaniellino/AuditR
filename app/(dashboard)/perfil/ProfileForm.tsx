"use client";

import { useFormState } from "react-dom";
import { updateProfile, type ProfileFormState } from "./actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";

const initialState: ProfileFormState = {};

export function ProfileForm({
  fullName,
  email,
  cpf,
}: {
  fullName: string;
  email: string;
  cpf: string | null;
}) {
  const [state, formAction] = useFormState(updateProfile, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Nome completo" htmlFor="full_name">
        <input id="full_name" name="full_name" required defaultValue={fullName} className={inputClass} />
      </Field>

      <Field label="E-mail" htmlFor="email" hint="Trocar o e-mail exige confirmação por link antes de valer.">
        <input id="email" name="email" type="email" required defaultValue={email} className={inputClass} />
      </Field>

      <Field label="CPF" htmlFor="cpf" hint="Não editável.">
        <input
          id="cpf"
          value={cpf ? formatCpfCnpj(cpf, "PF") : "Não informado"}
          disabled
          className={`${inputClass} opacity-70`}
        />
      </Field>

      <SubmitButton pendingLabel="Salvando..." className="self-start">
        Salvar
      </SubmitButton>
    </form>
  );
}
