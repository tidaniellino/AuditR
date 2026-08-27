"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { createInvite, type InviteFormState } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";
import { ROLE_LABELS, SOCIO_SIGNATURE_WARNING, type UserRole } from "@/lib/auth/permissions";

const initialState: InviteFormState = {};

export function InviteMemberModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createInvite, initialState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
      >
        + Convidar usuário
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Convidar usuário"
        description="Enviamos um e-mail com um link para o convidado criar a senha e acessar o sistema."
      >
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="E-mail" htmlFor="invite_email">
            <input id="invite_email" name="email" type="email" required className={inputClass} />
          </Field>

          <Field label="Perfil" htmlFor="invite_role">
            <select
              id="invite_role"
              name="role"
              required
              defaultValue="funcionario"
              className={inputClass}
              onChange={(e) => {
                if (e.target.value === "socio" && !confirm(SOCIO_SIGNATURE_WARNING)) {
                  e.target.value = "funcionario";
                }
              }}
            >
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <SubmitButton pendingLabel="Enviando..." className="self-start">
            Enviar convite
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
