import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingForm } from "./OnboardingForm";

export default function OnboardingPage() {
  return (
    <AuthShell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Nova conta</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Criar acesso</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Cadastre sua conta com e-mail e CPF/CNPJ.</p>

      <OnboardingForm />

      <p className="mt-6 text-sm text-muted">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-ink_text underline underline-offset-2">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
