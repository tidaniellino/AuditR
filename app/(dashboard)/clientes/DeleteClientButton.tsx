"use client";

import { deleteClientRecord } from "./actions";
import { TrashIcon } from "@/components/dashboard/icons";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <form
      action={deleteClientRecord}
      onSubmit={(event) => {
        if (!confirm(`Excluir o cliente "${clientName}"? Essa ação não pode ser desfeita.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="client_id" value={clientId} />
      <button
        type="submit"
        aria-label="Excluir cliente"
        title="Excluir"
        className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-stamp-tint hover:text-stamp"
      >
        <TrashIcon />
      </button>
    </form>
  );
}
