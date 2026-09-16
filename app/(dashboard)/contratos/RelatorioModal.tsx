"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, inputClass } from "@/components/ui/Field";

export function RelatorioModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-card border border-edge bg-card px-4 py-2.5 text-sm font-medium text-ink_text transition-colors hover:bg-mist"
      >
        Gerar relatório
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Relatório de contratos"
        description="Exporte os contratos gerados em um período, em CSV ou XLS."
      >
        <form method="get" action="/contratos/relatorio" target="_blank" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="De" htmlFor="relatorio_de" hint="Opcional">
              <input id="relatorio_de" name="de" type="date" className={inputClass} />
            </Field>
            <Field label="Até" htmlFor="relatorio_ate" hint="Opcional">
              <input id="relatorio_ate" name="ate" type="date" className={inputClass} />
            </Field>
          </div>

          <div className="mt-1 flex flex-wrap gap-3">
            <button
              type="submit"
              name="formato"
              value="csv"
              className="rounded-card border border-edge bg-card px-4 py-2.5 text-sm font-medium text-ink_text transition-colors hover:bg-mist"
            >
              Baixar CSV
            </button>
            <button
              type="submit"
              name="formato"
              value="xlsx"
              className="rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
            >
              Baixar XLS
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
