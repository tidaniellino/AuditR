"use client";

import { useFormState } from "react-dom";
import { createTemplate, type TemplateFormState } from "../actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

const initialState: TemplateFormState = {};

export function TemplateForm() {
  const [state, formAction] = useFormState(createTemplate, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
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

      <p className="-mt-2 rounded-card border border-edge bg-mist px-3.5 py-2.5 text-xs text-muted">
        Como a assinatura aqui é eletrônica, remova do arquivo antes de subir qualquer bloco de
        "TESTEMUNHAS" e linhas de assinatura manual (traços) — o sistema já gera automaticamente o
        registro de assinatura de cada parte.
      </p>

      <SubmitButton pendingLabel="Enviando..." className="self-start">
        Salvar modelo
      </SubmitButton>
    </form>
  );
}
