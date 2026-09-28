"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex items-center justify-center rounded-card px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "btn-primary",
    ghost: "btn-secondary",
  };

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {pending ? (pendingLabel ?? "Enviando...") : children}
    </button>
  );
}
