"use client";

import { useFormState } from "react-dom";
import { addClauseVersion, type ClauseFormState } from "../../actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

const initialState: ClauseFormState = {};

export function NewVersionForm({ clauseId, currentContent }: { clauseId: string; currentContent: string }) {
  const [state, formAction] = useFormState(addClauseVersion, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="clause_id" value={clauseId} />

      <Field label="Conteúdo da nova versão" htmlFor="content" hint="Use {{variavel}} para campos dinâmicos">
        <textarea
          id="content"
          name="content"
          required
          rows={8}
          defaultValue={currentContent}
          className={`${inputClass} font-mono text-[13px]`}
        />
      </Field>

      <Field label="Motivo da alteração" htmlFor="change_reason">
        <input id="change_reason" name="change_reason" required className={inputClass} />
      </Field>

      <SubmitButton pendingLabel="Salvando..." className="self-start">
        Publicar nova versão
      </SubmitButton>
    </form>
  );
}
