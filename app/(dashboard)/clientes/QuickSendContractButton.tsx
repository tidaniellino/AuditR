"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { quickSendContractForClient, type QuickSendResult } from "../contratos/actions";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { SendIcon } from "@/components/dashboard/icons";

const initialState: QuickSendResult = {};

type Mode = "template" | "upload";

export function QuickSendContractButton({
  client,
  templates,
  clauses,
  hasLetterhead,
}: {
  client: {
    id: string;
    tipo_pessoa: "PF" | "PJ";
    cpf_cnpj: string;
    nome_razao_social: string;
    email: string | null;
    telefone: string | null;
  };
  templates: { id: string; name: string; contract_type: string | null; is_system_default: boolean; previewUrl: string | null }[];
  clauses: { id: string; title: string }[];
  hasLetterhead: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("template");
  const [state, formAction] = useFormState(quickSendContractForClient, initialState);
  useActionToast(state);

  const templatesById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const selectedTemplate = selectedTemplateId ? templatesById.get(selectedTemplateId) ?? null : null;

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      formRef.current?.reset();
      setMode("template");
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enviar contrato"
        title="Enviar contrato"
        className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-mist hover:text-brand-via"
      >
        <SendIcon />
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Enviar contrato" description={client.nome_razao_social} size="lg">
        <div className="mb-4 rounded-card border border-edge bg-mist px-3.5 py-2.5 text-sm">
          <p className="text-ink_text">{client.nome_razao_social}</p>
          <p className="text-xs text-muted">
            {formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa)}
            {client.email ? ` · ${client.email}` : ""}
            {client.telefone ? ` · ${client.telefone}` : ""}
          </p>
        </div>

        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="client_id" value={client.id} />
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

          {mode === "template" ? (
            <>
              <Field label="Modelo de contrato" htmlFor="template_id">
                <div className="flex items-center gap-2">
                  <select
                    id="template_id"
                    name="template_id"
                    required
                    className={inputClass}
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="">— Selecionar —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.contract_type ? ` · ${t.contract_type}` : ""}
                        {t.is_system_default ? " · Modelo do sistema" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate?.previewUrl && (
                    <a
                      href={selectedTemplate.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 whitespace-nowrap rounded-card border border-edge px-3 py-2.5 text-xs font-medium text-ink_text hover:bg-mist"
                    >
                      Pré-visualizar
                    </a>
                  )}
                </div>
                {selectedTemplate?.is_system_default && (
                  <p className="mt-1.5 text-xs text-muted">Modelo pronto do sistema, disponível para todos os escritórios.</p>
                )}
              </Field>

              <Field label="Valor dos honorários" htmlFor="valor" hint="Opcional — em reais, ex.: 1.500,00">
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

              {hasLetterhead && (
                <label className="flex items-start gap-2.5 rounded-card border border-edge bg-mist px-3.5 py-2.5 text-sm text-ink_text">
                  <input type="checkbox" name="use_letterhead" className="mt-0.5 accent-brand-via" />
                  <span>
                    <span className="font-medium">Usar papel timbrado</span>
                    <span className="block text-xs text-muted">
                      Gera o PDF com o cabeçalho e rodapé timbrados cadastrados em Minha Empresa.
                    </span>
                  </span>
                </label>
              )}
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
      </Modal>
    </>
  );
}
