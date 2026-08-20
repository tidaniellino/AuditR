"use client";

import { deleteTemplate } from "./actions";
import { TrashIcon } from "@/components/dashboard/icons";

export function DeleteTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  return (
    <form
      action={deleteTemplate}
      onSubmit={(event) => {
        if (!confirm(`Excluir o modelo "${templateName}"? Essa ação não pode ser desfeita.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="template_id" value={templateId} />
      <button
        type="submit"
        aria-label="Excluir modelo"
        title="Excluir"
        className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-stamp-tint hover:text-stamp"
      >
        <TrashIcon />
      </button>
    </form>
  );
}
