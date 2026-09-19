"use client";

import { useFormState } from "react-dom";
import { uploadLetterhead, removeLetterhead, type LetterheadFormState } from "./actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";
import { formatFileSize } from "@/lib/storage/templates";

const initialState: LetterheadFormState = {};

export function LetterheadForm({
  currentFileName,
  currentFileSize,
  currentFileUrl,
}: {
  currentFileName: string | null;
  currentFileSize: number | null;
  currentFileUrl: string | null;
}) {
  const [state, formAction] = useFormState(uploadLetterhead, initialState);
  useActionToast(state);

  return (
    <div className="flex max-w-xl flex-col gap-3">
      {currentFileName && (
        <div className="flex items-center justify-between rounded-card border border-edge bg-mist px-3.5 py-2.5 text-sm">
          <div>
            <p className="text-ink_text">
              {currentFileUrl ? (
                <a href={currentFileUrl} target="_blank" rel="noreferrer" className="text-brand-via hover:underline">
                  {currentFileName}
                </a>
              ) : (
                currentFileName
              )}
              {currentFileSize ? <span className="ml-1 text-xs text-muted">({formatFileSize(currentFileSize)})</span> : null}
            </p>
          </div>
          <form action={removeLetterhead}>
            <button type="submit" className="text-xs text-stamp-dim hover:underline">
              Remover
            </button>
          </form>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <Field
          label={currentFileName ? "Substituir arquivo de papel timbrado" : "Arquivo de papel timbrado"}
          htmlFor="letterhead_file"
          hint="Arquivo .docx com o cabeçalho e rodapé timbrados já configurados no Word — até 10 MB"
        >
          <input
            id="letterhead_file"
            name="file"
            type="file"
            required
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-from`}
          />
        </Field>
        <SubmitButton pendingLabel="Enviando..." className="self-start">
          Enviar papel timbrado
        </SubmitButton>
      </form>
    </div>
  );
}
