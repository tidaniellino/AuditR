"use client";

import { useFormState } from "react-dom";
import { createContract, type ContractFormState } from "../actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initialState: ContractFormState = {};

const PLACEHOLDERS = [
  "cliente_nome",
  "cliente_cpf_cnpj",
  "cliente_email",
  "cliente_telefone",
  "cliente_endereco",
  "contrato_titulo",
  "contrato_tipo",
  "escritorio_nome",
  "data_atual",
];

export function ContractForm({
  clients,
  templates,
}: {
  clients: { id: string; nome_razao_social: string; tipo_pessoa: string }[];
  templates: { id: string; name: string; contract_type: string | null }[];
}) {
  const [state, formAction] = useFormState(createContract, initialState);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        {state?.error && <Alert tone="error">{state.error}</Alert>}

        <Field label="Cliente" htmlFor="client_id">
          <select id="client_id" name="client_id" required className={inputClass}>
            <option value="">— Selecionar —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_razao_social}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Modelo de contrato" htmlFor="template_id">
          <select id="template_id" name="template_id" required className={inputClass}>
            <option value="">— Selecionar —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.contract_type ? ` · ${t.contract_type}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Título do contrato" htmlFor="title" hint="Opcional — por padrão usa modelo + cliente">
          <input id="title" name="title" className={inputClass} />
        </Field>

        <SubmitButton pendingLabel="Gerando documento..." className="self-start">
          Gerar contrato
        </SubmitButton>
      </form>

      <div className="rounded-card border border-edge bg-mist px-4 py-3.5 text-xs text-muted">
        <p className="font-medium text-ink_text">Placeholders disponíveis no arquivo .docx</p>
        <p className="mt-1">
          Use <code className="font-mono text-brand-via">{"{chave}"}</code> no corpo do documento — por
          exemplo <code className="font-mono text-brand-via">{"{cliente_nome}"}</code>:
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((key) => (
            <code key={key} className="rounded-md border border-edge bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink_text">
              {`{${key}}`}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
