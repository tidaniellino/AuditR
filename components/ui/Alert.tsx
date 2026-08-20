export function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const tones = {
    error: "bg-stamp-tint text-stamp-dim",
    success: "bg-seal-tint text-seal",
  };
  return <p className={`rounded-card px-3.5 py-2.5 text-sm ${tones[tone]}`}>{children}</p>;
}
