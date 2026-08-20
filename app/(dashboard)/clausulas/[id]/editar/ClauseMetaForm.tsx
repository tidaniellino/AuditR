"use client";

import { useFormState } from "react-dom";
import { updateClauseMeta, type ClauseFormState } from "../../actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initialState: ClauseFormState = {};

export function ClauseMetaForm({
  clauseId,
  title,
  categoryId,
  clauseType,
  applicableContractTypes,
  categories,
}: {
  clauseId: string;
  title: string;
  categoryId: string | null;
  clauseType: string | null;
  applicableContractTypes: string[];
  categories: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(updateClauseMeta, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="clause_id" value={clauseId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Título da cláusula" htmlFor="title">
        <input id="title" name="title" required defaultValue={title} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria" htmlFor="category_id">
          <select id="category_id" name="category_id" className={inputClass} defaultValue={categoryId ?? ""}>
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo da cláusula" htmlFor="clause_type">
          <input id="clause_type" name="clause_type" defaultValue={clauseType ?? ""} className={inputClass} />
        </Field>

        <Field label="Tipos de contrato aplicáveis" htmlFor="applicable_contract_types">
          <input
            id="applicable_contract_types"
            name="applicable_contract_types"
            defaultValue={applicableContractTypes.join(", ")}
            className={inputClass}
          />
        </Field>
      </div>

      <SubmitButton pendingLabel="Salvando..." variant="ghost" className="self-start">
        Salvar dados
      </SubmitButton>
    </form>
  );
}
