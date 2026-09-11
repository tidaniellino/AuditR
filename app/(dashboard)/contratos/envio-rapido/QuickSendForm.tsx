"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { quickSendContract, type QuickSendResult } from "../actions";
import { formatCpfOuCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

const initialState: QuickSendResult = {};

type Mode = "template" | "upload";

export function QuickSendForm({
  templates,
  clauses,
}: {
  templates: { id: string; name: string; contract_type: string | null }[];
  clauses: { id: string; title: string }[];
}) {
  const [state, formAction] = useFormState(quickSendContract, initialState);
  useActionToast(state);

  const [mode, setMode] = useState<Mode>("template");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [showClientModal, setShowClientModal] = useState(false);
  const handledClientId = useRef<string | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.isNewClient && state.clientId && state.clientId !== handledClientId.current) {
      handledClientId.current = state.clientId;
      setShowClientModal(true);
      formRef.current?.reset();
      setCpfCnpj("");
    }
  }, [state]);

  return (
    <>
      <form ref={formRef} action={formAction} className="flex max-w-lg flex-col gap-4">
        <input type="hidden" name="mode" value={mode} />

        <div className="flex gap-2 rounded-card border border-edge bg-mist p-1">
          <button
            type="button"
            onClick={() => setMode("template")}
            className={`flex-1 rounded-card px-3 py-2 text-sm font-medium transition-colors ${
              mode === "template" ? "bg-card text-ink_text shadow-sm" : "text-muted hover:text-ink_text"
            }`}
          >
            Selecionar modelo
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex-1 rounded-card px-3 py-2 text-sm font-medium transition-colors ${
              mode === "upload" ? "bg-card text-ink_text shadow-sm" : "text-muted hover:text-ink_text"
            }`}
          >
            Upload de contrato pronto
          </button>
        </div>

        <Field label="Nome do contratante" htmlFor="nome">
          <input id="nome" name="nome" required className={inputClass} />
        </Field>

        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>

        <Field label="WhatsApp" htmlFor="telefone" hint="Opcional — usado para enviar o código de assinatura também por WhatsApp">
          <input id="telefone" name="telefone" className={inputClass} placeholder="(11) 91234-5678" />
        </Field>

        <Field label="CPF/CNPJ" htmlFor="cpf_cnpj">
          <input
            id="cpf_cnpj"
            name="cpf_cnpj"
            required
            value={formatCpfOuCnpj(cpfCnpj)}
            onChange={(e) => setCpfCnpj(onlyDigits(e.target.value))}
            className={inputClass}
          />
        </Field>

        {mode === "template" ? (
          <>
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

            <Field label="Valor acordado" htmlFor="valor" hint="Opcional — em reais, ex.: 1.500,00">
              <input id="valor" name="valor" inputMode="decimal" placeholder="0,00" className={inputClass} />
            </Field>

            <Field
              label="Cláusula personalizada"
              htmlFor="clause_id"
              hint="Opcional — anexada ao final do contrato gerado"
            >
              <select id="clause_id" name="clause_id" className={inputClass}>
                <option value="">— Nenhuma —</option>
                {clauses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : (
          <Field label="Arquivo do contrato" htmlFor="file" hint="Arquivo .docx, já pronto para assinatura">
            <input id="file" name="file" type="file" accept=".doc,.docx" required className={inputClass} />
          </Field>
        )}

        <SubmitButton pendingLabel="Enviando..." className="self-start">
          Enviar para assinatura
        </SubmitButton>
      </form>

      <Modal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        title="Cliente registrado"
        description="Contrato enviado com sucesso. Quer completar o cadastro desse cliente agora (endereço, nome fantasia, etc.)?"
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowClientModal(false)}
            className="rounded-card border border-edge px-4 py-2.5 text-sm font-medium text-ink_text hover:bg-mist"
          >
            Agora não
          </button>
          <Link
            href={`/clientes/${state.clientId}`}
            className="rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-from"
          >
            Completar cadastro
          </Link>
        </div>
      </Modal>
    </>
  );
}
