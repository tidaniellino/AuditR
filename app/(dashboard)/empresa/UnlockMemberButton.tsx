"use client";

import { useState, useTransition } from "react";
import { unlockMemberLogin } from "./actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function UnlockMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="rounded-full border border-stamp/40 bg-stamp-tint px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-stamp-dim transition-colors hover:bg-stamp-tint/70 disabled:opacity-50"
      >
        {isPending ? "Desbloqueando..." : "Bloqueado · Desbloquear"}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Desbloquear login"
        description={`Desbloquear o acesso de "${memberName}"? A contagem de tentativas erradas será zerada.`}
        confirmLabel="Desbloquear"
        tone="warning"
        onConfirm={() => startTransition(() => unlockMemberLogin(memberId))}
      />
    </>
  );
}
