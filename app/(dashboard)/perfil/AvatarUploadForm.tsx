"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { uploadAvatar, type AvatarFormState } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

const initialState: AvatarFormState = {};

export function AvatarUploadForm({ avatarUrl, initial }: { avatarUrl: string | null; initial: string }) {
  const [state, formAction] = useFormState(uploadAvatar, initialState);
  useActionToast(state);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint font-mono text-lg text-brand-from">
        {preview || avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview ?? avatarUrl ?? ""} alt="Foto de perfil" className="size-full object-cover" />
        ) : (
          initial
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="w-fit cursor-pointer rounded-card border border-edge px-3.5 py-2 text-sm font-medium text-ink_text transition-colors hover:bg-mist">
          Escolher foto
          <input
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPreview(URL.createObjectURL(file));
              formRef.current?.requestSubmit();
            }}
          />
        </label>
        <p className="text-xs text-muted">JPG, PNG ou WEBP — até 3 MB.</p>
      </div>

      <SubmitButton pendingLabel="Enviando..." className="hidden">
        Enviar
      </SubmitButton>
    </form>
  );
}
