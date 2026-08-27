"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/dashboard/icons";

type ToastTone = "success" | "error";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<{ push: (tone: ToastTone, message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-in fade-in-0 slide-in-from-bottom-2 pointer-events-auto flex items-start gap-2 rounded-card border bg-card px-4 py-3 text-sm shadow-lg shadow-ink-900/10 ${
              t.tone === "error" ? "border-stamp/30 text-stamp-dim" : "border-seal/30 text-seal"
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar"
              className="text-muted transition-colors hover:text-ink_text"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de um ToastProvider.");
  return ctx;
}

/** Dispara um toast sempre que a `state` de um useFormState ganhar error/success. */
export function useActionToast(state: { error?: string; success?: string } | null | undefined) {
  const { push } = useToast();
  const error = state?.error;
  const success = state?.success;
  // Dedup por valor (não por referência de `state`): algumas chamadas passam um
  // objeto literal novo a cada render, que mudaria de referência sem mudar de valor.
  const lastRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const key = error ? `error:${error}` : success ? `success:${success}` : undefined;
    if (!key || key === lastRef.current) return;
    lastRef.current = key;
    if (error) push("error", error);
    else if (success) push("success", success);
  }, [error, success, push]);
}
