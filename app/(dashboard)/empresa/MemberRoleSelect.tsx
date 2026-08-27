"use client";

import { useTransition } from "react";
import { updateMemberRole } from "./actions";
import { ROLE_LABELS, SOCIO_SIGNATURE_WARNING, type UserRole } from "@/lib/auth/permissions";
import { inputClass } from "@/components/ui/Field";

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

  return (
    <select
      value={role}
      disabled={disabled || isPending}
      onChange={(e) => {
        const nextRole = e.target.value as UserRole;
        if (nextRole === "socio" && !confirm(SOCIO_SIGNATURE_WARNING)) {
          e.target.value = role;
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
  );
}
