"use client";

import { useRef, useState, useTransition } from "react";
import { updateMemberRole } from "./actions";
import { ROLE_LABELS, SOCIO_SIGNATURE_WARNING, type UserRole } from "@/lib/auth/permissions";
import { inputClass } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function MemberRoleSelect({
  memberId,
  role,
  disabled,
}: {
  memberId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const confirmedRef = useRef(false);

  return (
    <>
      <select
        ref={selectRef}
        value={role}
        disabled={disabled || isPending}
        onChange={(e) => {
          const nextRole = e.target.value as UserRole;
          if (nextRole === "socio") {
            setConfirmOpen(true);
            return;
          }
          startTransition(() => updateMemberRole(memberId, nextRole));
        }}
        title={disabled ? "Você não pode alterar seu próprio perfil" : undefined}
        className={`${inputClass} py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            if (!confirmedRef.current && selectRef.current) selectRef.current.value = role;
            confirmedRef.current = false;
          }
        }}
        title="Associar perfil Sócio"
        description={SOCIO_SIGNATURE_WARNING}
        confirmLabel="Confirmar"
        tone="warning"
        onConfirm={() => {
          confirmedRef.current = true;
          startTransition(() => updateMemberRole(memberId, "socio"));
        }}
      />
    </>
  );
}
