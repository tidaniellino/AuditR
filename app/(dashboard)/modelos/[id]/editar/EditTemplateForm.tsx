"use client";

import { useFormState } from "react-dom";
import { updateTemplate, type TemplateFormState } from "../../actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { formatFileSize } from "@/lib/storage/templates";

const initialState: TemplateFormState = {};

export function EditTemplateForm({
  templateId,
  name,
  contractType,
  description,
  currentFileName,
  currentFileSize,
  currentFileUrl,
}: {
  templateId: string;
  name: string;
  contractType: string | null;
  description: string | null;
  currentFileName: string | null;
  currentFileSize: number | null;
  currentFileUrl: string | null;
}) {
  const [state, formAction] = useFormState(updateTemplate, initialState);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="template_id" value={templateId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Nome do modelo" htmlFor="name">
        <input id="name" name="name" required defaultValue={name} className={inputClass} />
      </Field>

      <Field label="Tipo de contrato" htmlFor="contract_type" hint="Ex.: Serviços, Locação, Honorários">
        <input id="contract_type" name="contract_type" required defaultValue={contractType ?? ""} className={inputClass} />
      </Field>

      <Field label="Descrição" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          defaultValue={description ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label={currentFileName ? "Substituir arquivo-modelo" : "Arquivo-modelo"}
        htmlFor="file"
        hint="Deixe em branco para manter o arquivo atual — .doc ou .docx, até 10 MB"
      >
        {currentFileName && (
          <p className="mb-1.5 text-xs text-muted">
            Atual:{" "}
            {currentFileUrl ? (
              <a href={currentFileUrl} target="_blank" rel="noreferrer" className="text-brand-via hover:underline">
                {currentFileName}
              </a>
            ) : (
              currentFileName
            )}
            {currentFileSize ? ` (${formatFileSize(currentFileSize)})` : ""}
          </p>
        )}
        <input
          id="file"
          name="file"
          type="file"
          required={!currentFileName}
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-from`}
        />
      </Field>

      <SubmitButton pendingLabel="Salvando..." className="self-start">
        Salvar alterações
      </SubmitButton>
    </form>
  );
}
