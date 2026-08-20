export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">{title}</h1>

      <div className="mt-8 rounded-card border border-dashed border-edge bg-white px-8 py-14 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-via">Em construção</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
