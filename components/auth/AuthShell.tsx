export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="bg-audit-grid relative flex h-64 shrink-0 items-center justify-center overflow-hidden bg-card p-8 lg:h-auto lg:w-1/2">
        {/* Marca d'água do ícone em escala grande, recortada pela borda do
            painel — dá profundidade sem competir com a marca principal. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon-watermark.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 w-[34rem] opacity-[0.06] lg:w-[42rem]"
        />

        <div
          className="animate-drift absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-to/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="animate-drift absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-via/20 blur-3xl [animation-delay:-5s]"
          aria-hidden="true"
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/imageminicio.png"
          alt="AuditR — Gestão e auditoria de contratos"
          className="animate-logo-in relative z-10 w-full max-w-md drop-shadow-sm lg:max-w-lg"
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-mist px-6 py-12 lg:px-16">
        <div className="animate-rise w-full max-w-sm rounded-2xl border border-edge bg-card px-8 py-10 shadow-xl shadow-ink-900/5">
          {children}
        </div>
      </div>
    </div>
  );
}
