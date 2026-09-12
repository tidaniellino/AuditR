"use client";

import { useTransition } from "react";
import { setDefaultSigner, clearDefaultSigner } from "./actions";
import { useToast } from "@/components/ui/Toast";

export function DefaultSignerToggle({ memberId, isDefault }: { memberId: string; isDefault: boolean }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();

  function handleClick() {
    startTransition(async () => {
      const result = isDefault ? await clearDefaultSigner(memberId) : await setDefaultSigner(memberId);
      if (result?.error) push("error", result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Sócio usado para assinar quando o contrato exige só um signatário"
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isDefault ? "border-seal/40 bg-seal/10 text-seal" : "border-edge text-muted hover:bg-mist"
      }`}
    >
      {isDefault ? "Signatário padrão" : "Definir como padrão"}
    </button>
  );
}
