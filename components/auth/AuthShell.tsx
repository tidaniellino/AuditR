export function AuthShell({
  children,
  compactHeroOnMobile = false,
}: {
  children: React.ReactNode;
  /** Cadastro/login (Regra 5): no mobile, troca a ilustração grande por só a
   *  logo pequena (≤48px), pra caber "Continuar com Google" + 1º campo sem
   *  rolagem em 360×640. Telas de recuperação/troca de senha mantêm o hero
   *  cheio (não fazem parte do escopo dessa otimização). */
  compactHeroOnMobile?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div
        className={`bg-audit-grid relative flex shrink-0 items-center justify-center overflow-hidden bg-card lg:h-auto lg:w-1/2 ${
          compactHeroOnMobile ? "h-12 p-2 lg:p-8" : "h-64 p-8"
        }`}
      >
        {/* Marca d'água do ícone em escala grande, recortada pela borda do
            painel — dá profundidade sem competir com a marca principal.
            Escondida no mobile compacto: não cabe em 64px de altura. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon-watermark.png"
          alt=""
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-24 -right-24 w-[34rem] opacity-[0.06] lg:w-[42rem] ${
            compactHeroOnMobile ? "hidden lg:block" : ""
          }`}
        />

        <div
          className={`animate-drift absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-to/20 blur-3xl ${
            compactHeroOnMobile ? "hidden lg:block" : ""
          }`}
          aria-hidden="true"
        />
        <div
          className={`animate-drift absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-via/20 blur-3xl [animation-delay:-5s] ${
            compactHeroOnMobile ? "hidden lg:block" : ""
          }`}
          aria-hidden="true"
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/imageminicio.png"
          alt="AuditR — Gestão e auditoria de contratos"
          className={
            compactHeroOnMobile
              ? "relative z-10 h-8 w-auto drop-shadow-sm lg:h-auto lg:w-full lg:max-w-lg lg:animate-logo-in"
              : "animate-logo-in relative z-10 w-full max-w-md drop-shadow-sm lg:max-w-lg"
          }
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-mist px-6 py-8 lg:px-16 lg:py-12">
        <div className="w-full max-w-sm rounded-2xl border border-edge bg-card px-8 py-10 shadow-xl shadow-ink-900/5 lg:animate-rise">
          {children}
        </div>
      </div>
    </div>
  );
}
