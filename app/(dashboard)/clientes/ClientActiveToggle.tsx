"use client";

import { useTransition } from "react";
import { toggleClientActive } from "./actions";

export function ClientActiveToggle({ clientId, active }: { clientId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Desativar cliente" : "Ativar cliente"}
        disabled={isPending}
        onClick={() => startTransition(() => toggleClientActive(clientId, !active))}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
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
