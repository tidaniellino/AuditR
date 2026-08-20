export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink_text">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "rounded-card border border-edge bg-mist px-3.5 py-2.5 text-sm text-ink_text placeholder:text-muted/70 transition-colors focus:border-brand-via focus:outline-none focus:ring-2 focus:ring-brand-via/20";
