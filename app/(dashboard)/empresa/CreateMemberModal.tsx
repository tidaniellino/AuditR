"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { createMember, type MemberFormState } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useActionToast } from "@/components/ui/Toast";
import { ROLE_LABELS, SOCIO_SIGNATURE_WARNING, type UserRole } from "@/lib/auth/permissions";
import { PASSWORD_POLICY_HINT } from "@/lib/validation/password";
import { formatCPF, onlyDigits } from "@/lib/validation/cpf-cnpj";

const initialState: MemberFormState = {};

export function CreateMemberModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createMember, initialState);
  useActionToast(state);

  const [cpf, setCpf] = useState("");
  const roleSelectRef = useRef<HTMLSelectElement>(null);
  const [socioConfirmOpen, setSocioConfirmOpen] = useState(false);
  const socioConfirmedRef = useRef(false);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setCpf("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary shrink-0 rounded-card px-4 py-2.5 text-sm font-medium"
      >
        + Cadastrar novo usuário
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Cadastrar novo usuário"
        description="A conta já é criada com a senha definida abaixo — o usuário será obrigado a trocá-la no primeiro acesso."
      >
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Nome completo" htmlFor="member_full_name">
            <input id="member_full_name" name="full_name" required autoComplete="name" className={inputClass} />
          </Field>

          <Field label="CPF" htmlFor="member_cpf">
            <input
              id="member_cpf"
              name="cpf"
              required
              value={formatCPF(cpf)}
              onChange={(e) => setCpf(onlyDigits(e.target.value))}
              className={inputClass}
            />
          </Field>

          <Field label="E-mail" htmlFor="member_email">
            <input id="member_email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </Field>

          <Field label="Senha" htmlFor="member_password" hint={PASSWORD_POLICY_HINT}>
            <input
              id="member_password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>

          <Field label="Confirmar senha" htmlFor="member_confirm_password">
            <input
              id="member_confirm_password"
              name="confirm_password"
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>

          <Field label="Perfil de acesso" htmlFor="member_role">
            <select
              id="member_role"
              name="role"
              required
              defaultValue="funcionario"
              ref={roleSelectRef}
              className={inputClass}
              onChange={(e) => {
                if (e.target.value === "socio") setSocioConfirmOpen(true);
              }}
            >
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <SubmitButton pendingLabel="Cadastrando..." className="mt-1 self-start">
            Cadastrar usuário
          </SubmitButton>
        </form>
      </Modal>

      <ConfirmDialog
        open={socioConfirmOpen}
        onOpenChange={(nextOpen) => {
          setSocioConfirmOpen(nextOpen);
          if (!nextOpen) {
            if (!socioConfirmedRef.current && roleSelectRef.current) roleSelectRef.current.value = "funcionario";
            socioConfirmedRef.current = false;
          }
        }}
        title="Associar perfil Sócio"
        description={SOCIO_SIGNATURE_WARNING}
        confirmLabel="Confirmar"
        tone="warning"
        onConfirm={() => {
          socioConfirmedRef.current = true;
        }}
      />
    </>
  );
}
