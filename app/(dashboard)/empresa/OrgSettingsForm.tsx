"use client";

import { useFormState } from "react-dom";
import { updateOrganization, type OrgFormState } from "./actions";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

const initialState: OrgFormState = {};

export interface OrgRecord {
  name: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: Record<string, string | null> | null;
}

export function OrgSettingsForm({ org }: { org: OrgRecord }) {
  const [state, formAction] = useFormState(updateOrganization, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <Field label="Nome da empresa" htmlFor="name">
        <input id="name" name="name" required defaultValue={org.name} className={inputClass} />
      </Field>

      <Field label="CNPJ" htmlFor="cnpj">
        <input id="cnpj" name="cnpj" defaultValue={org.cnpj ?? ""} className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" defaultValue={org.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Telefone" htmlFor="telefone">
          <input id="telefone" name="telefone" defaultValue={org.telefone ?? ""} className={inputClass} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-card border border-edge p-4">
        <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Endereço</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            name="logradouro"
            placeholder="Logradouro"
            defaultValue={org.endereco?.logradouro ?? ""}
            className={`col-span-2 ${inputClass}`}
          />
          <input name="numero" placeholder="Número" defaultValue={org.endereco?.numero ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            name="complemento"
            placeholder="Complemento"
            defaultValue={org.endereco?.complemento ?? ""}
            className={inputClass}
          />
          <input name="bairro" placeholder="Bairro" defaultValue={org.endereco?.bairro ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            name="municipio"
            placeholder="Município"
            defaultValue={org.endereco?.municipio ?? ""}
            className={`col-span-2 ${inputClass}`}
          />
          <input
            name="uf"
            placeholder="UF"
            maxLength={2}
            defaultValue={org.endereco?.uf ?? ""}
            className={`uppercase ${inputClass}`}
          />
        </div>
        <div className="w-40">
          <input name="cep" placeholder="CEP" maxLength={9} defaultValue={org.endereco?.cep ?? ""} className={inputClass} />
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Salvando..." className="self-start">
        Salvar dados da empresa
      </SubmitButton>
    </form>
  );
}
