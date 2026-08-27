"use client";

import { useRef, useState } from "react";
import { deleteClientRecord } from "./actions";
import { TrashIcon } from "@/components/dashboard/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={deleteClientRecord}>
        <input type="hidden" name="client_id" value={clientId} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Excluir cliente"
          title="Excluir"
          className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-stamp-tint hover:text-stamp"
        >
          <TrashIcon />
        </button>
      </form>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir cliente"
        description={`Excluir o cliente "${clientName}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        tone="danger"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
