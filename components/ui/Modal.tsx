"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { CloseIcon } from "@/components/dashboard/icons";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  const maxWidth = size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink_text/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] ${maxWidth} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-edge bg-card p-6 shadow-xl shadow-ink-900/10 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`}
        >
          <DialogPrimitive.Title className="font-display text-xl text-ink_text">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description>
          )}
          <div className="mt-4">{children}</div>
          <DialogPrimitive.Close
            aria-label="Fechar"
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-mist hover:text-ink_text"
          >
            <CloseIcon />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
