import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; oauth_error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell compactHeroOnMobile>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Acesso</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Entrar</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Acesse com seu e-mail e senha.</p>

      <LoginForm redirectTo={params.redirect ?? "/painel"} oauthError={params.oauth_error} />

      <p className="mt-6 text-sm text-muted">
        Ainda não tem uma conta?{" "}
        <Link href="/onboarding" className="font-medium text-ink_text underline underline-offset-2">
          Criar acesso
        </Link>
      </p>
    </AuthShell>
  );
}
