"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ClientForm, type ClientRecord } from "./novo/ClientForm";
import { PencilIcon } from "@/components/dashboard/icons";

export function EditClientModal({ client }: { client: ClientRecord }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Editar cliente"
        title="Editar"
        className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-mist hover:text-brand-via"
      >
        <PencilIcon />
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Editar cliente" description={client.nome_razao_social} size="lg">
        <ClientForm client={client} />
      </Modal>
    </>
  );
}
