import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/imagemmenu.png" alt="AuditR" className="h-14 w-14" />
      <h1 className="mt-2 font-display text-2xl text-ink_text">Acesso restrito</h1>
      <p className="max-w-sm text-sm text-muted">
        Esta ação é permitida apenas para perfis Sócio ou Compliance Legal.
      </p>
      <Link href="/" className="mt-2 text-sm font-medium text-brand-via underline underline-offset-2">
        Voltar
      </Link>
    </main>
  );
}
