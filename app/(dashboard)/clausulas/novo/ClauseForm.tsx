"use client";

import { useFormState } from "react-dom";
import { createClause, type ClauseFormState } from "../actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

const initialState: ClauseFormState = {};

export function ClauseForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createClause, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <Field label="Título da cláusula" htmlFor="title">
        <input id="title" name="title" required className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Categoria" htmlFor="category_id" hint="Deixe em branco para criar uma nova ao lado">
          <select id="category_id" name="category_id" className={inputClass} defaultValue="">
            <option value="">— Selecionar —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Nova categoria" htmlFor="new_category" hint="Opcional, se não escolheu acima">
          <input id="new_category" name="new_category" className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Tipo da cláusula"
          htmlFor="clause_type"
          hint="Ex.: foro, arbitragem, confidencialidade"
        >
          <input id="clause_type" name="clause_type" className={inputClass} />
        </Field>

        <Field
          label="Tipos de contrato aplicáveis"
          htmlFor="applicable_contract_types"
          hint="Separe por vírgula, ex.: Serviços, Locação"
        >
          <input id="applicable_contract_types" name="applicable_contract_types" className={inputClass} />
        </Field>
      </div>

      <Field label="Conteúdo (v1.0)" htmlFor="content" hint="Use {{variavel}} para campos dinâmicos">
        <textarea id="content" name="content" required rows={8} className={`${inputClass} font-mono text-[13px]`} />
      </Field>

      <SubmitButton pendingLabel="Salvando..." className="self-start">
        Salvar cláusula
      </SubmitButton>
    </form>
  );
}
