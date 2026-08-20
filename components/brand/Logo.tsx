export function Logo({ size = 48, className = "" }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src="/logo.png" alt="AuditR" style={{ width: size, height: "auto" }} className={`rounded-lg ${className}`} />
  );
}
