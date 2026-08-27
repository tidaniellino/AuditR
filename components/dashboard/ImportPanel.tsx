"use client";

import { useRef, useState } from "react";
import type { ImportResult } from "@/lib/excel/types";
import { Alert } from "@/components/ui/Alert";

export function ImportPanel({
  title,
  description,
  templateHref,
  action,
}: {
  title: string;
  description: string;
  templateHref: string;
  action: (formData: FormData) => Promise<ImportResult>;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setResult(null);
    const res = await action(formData);
    setResult(res);
    setPending(false);
    if (!res.error) formRef.current?.reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-card border border-edge bg-card px-4 py-2.5 text-sm font-medium text-ink_text hover:bg-mist"
      >
        Importar do Excel
      </button>
    );
  }

  return (
    <div className="rounded-card border border-edge bg-card p-5 shadow-sm shadow-ink-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink_text">{title}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-sm text-muted hover:text-ink_text"
          aria-label="Fechar"
        >
          Fechar
        </button>
      </div>

      <a
        href={templateHref}
        className="mt-3 inline-flex text-sm font-medium text-brand-via underline underline-offset-2"
      >
        Baixar modelo de planilha (.xlsx)
      </a>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
      >
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm text-ink_text file:mr-3 file:rounded-card file:border-0 file:bg-mist file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink_text hover:file:bg-edge"
        />
        <SubmitButtonInline pending={pending} />
      </form>

      {result?.error && (
        <div className="mt-4">
          <Alert tone="error">{result.error}</Alert>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 space-y-2">
          <Alert tone="success">
            {result.inserted ?? 0} registro(s) importado(s) com sucesso.
            {result.skipped?.length ? ` ${result.skipped.length} linha(s) ignorada(s).` : ""}
          </Alert>
          {!!result.skipped?.length && (
            <ul className="max-h-40 overflow-y-auto rounded-card border border-edge bg-mist p-3 text-xs text-muted">
              {result.skipped.map((s) => (
                <li key={s.rowNumber}>
                  Linha {s.rowNumber}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SubmitButtonInline({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-none"
    >
      {pending ? "Importando..." : "Importar"}
    </button>
  );
}
