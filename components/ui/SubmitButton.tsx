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
    "inline-flex items-center justify-center rounded-card px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none";
  const variants = {
    primary:
      "bg-primary text-white shadow-md shadow-brand-via/25 hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35",
    ghost: "border border-edge bg-transparent text-ink_text hover:bg-mist",
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
