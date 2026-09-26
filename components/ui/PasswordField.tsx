"use client";

import { useId, useState } from "react";
import { inputClass } from "./Field";
import { EyeIcon, EyeOffIcon } from "@/components/dashboard/icons";

/** Campo de senha com botão de mostrar/ocultar — alvo de toque de 44x44px
 *  (Regra 5), sem depender de um id externo pra funcionar em qualquer form. */
export function PasswordField({
  id,
  name,
  autoComplete,
  required,
  minLength,
  maxLength,
  defaultValue,
}: {
  id?: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="relative">
      <input
        id={fieldId}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        title={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-0 top-0 flex h-full w-11 min-w-[44px] items-center justify-center text-muted hover:text-ink_text"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
