"use client";

import { useRef, useState } from "react";
import { deleteTemplate } from "./actions";
import { TrashIcon } from "@/components/dashboard/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeleteTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={deleteTemplate}>
        <input type="hidden" name="template_id" value={templateId} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Excluir modelo"
          title="Excluir"
          className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-stamp-tint hover:text-stamp"
        >
          <TrashIcon />
        </button>
      </form>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir modelo"
        description={`Excluir o modelo "${templateName}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        tone="danger"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
