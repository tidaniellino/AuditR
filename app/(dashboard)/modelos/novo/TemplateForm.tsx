"use client";

import { useFormState } from "react-dom";
import { createTemplate, type TemplateFormState } from "../actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initialState: TemplateFormState = {};

export function TemplateForm() {
  const [state, formAction] = useFormState(createTemplate, initialState);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Nome do modelo" htmlFor="name">
        <input id="name" name="name" required className={inputClass} />
      </Field>

      <Field label="Tipo de contrato" htmlFor="contract_type" hint="Ex.: Serviços, Locação, Honorários">
        <input id="contract_type" name="contract_type" required className={inputClass} />
      </Field>

      <Field label="Descrição" htmlFor="description">
        <textarea id="description" name="description" rows={3} required className={inputClass} />
      </Field>

      <Field
        label="Arquivo-modelo"
        htmlFor="file"
        hint="O documento (.doc ou .docx) que serve de base para este modelo de contrato — até 10 MB"
      >
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-from`}
        />
      </Field>

      <SubmitButton pendingLabel="Enviando..." className="self-start">
        Salvar modelo
      </SubmitButton>
    </form>
  );
}
