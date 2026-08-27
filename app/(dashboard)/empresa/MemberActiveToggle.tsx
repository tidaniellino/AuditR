"use client";

import { useTransition } from "react";
import { toggleMemberActive } from "./actions";

export function MemberActiveToggle({
  memberId,
  active,
  disabled,
}: {
  memberId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Desativar usuário" : "Ativar usuário"}
        disabled={disabled || isPending}
        title={disabled ? "Você não pode desativar a si mesmo" : undefined}
        onClick={() => startTransition(() => toggleMemberActive(memberId, !active))}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          active ? "bg-brand-to" : "bg-edge"
        }`}
      >
        <span
          className={`inline-block size-3.5 transform rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </button>
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{active ? "Ativo" : "Inativo"}</span>
    </label>
  );
}
