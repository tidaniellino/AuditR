"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { saveOrgDocument, type SaveOrgDocumentState } from "@/app/(dashboard)/empresa/actions";
import { formatCpfOuCnpj } from "@/lib/validation/cpf-cnpj";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";
import { trackEvent } from "@/lib/analytics/events";

const initialState: SaveOrgDocumentState = {};

/** Regra 2 — CPF/CNPJ sob demanda: aberto pela tela de geração de contrato
 *  quando `organizations.cnpj` ainda está vazio, em vez de bloquear com um
 *  erro simples. `onSaved` deve reenviar o formulário original (ex.:
 *  formRef.current?.requestSubmit()) pra retomar a geração sem perder os
 *  dados já preenchidos. */
export function OrgDocumentGateModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [state, formAction] = useFormState(saveOrgDocument, initialState);

  useEffect(() => {
    if (open) trackEvent("document_requested");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (state.success) {
      trackEvent("document_submitted");
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()} title="CPF ou CNPJ da empresa">
      <p className="text-sm text-muted">
        Precisamos do seu CPF ou CNPJ para emitir o contrato com validade jurídica.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <Field label="CPF ou CNPJ" htmlFor="documento" hint={state.error}>
          <input
            id="documento"
            name="documento"
            required
            inputMode="numeric"
            autoComplete="off"
            className={`${inputClass} min-h-[44px]`}
            onChange={(e) => {
              e.currentTarget.value = formatCpfOuCnpj(e.currentTarget.value);
            }}
          />
        </Field>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-card border border-edge px-4 py-2.5 text-sm font-medium text-ink_text hover:bg-mist"
          >
            Cancelar
          </button>
          <SubmitButton pendingLabel="Salvando..." className="min-h-[44px] flex-1">
            Salvar
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
