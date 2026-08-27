import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function EsqueciSenhaPage() {
  return (
    <AuthShell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Acesso</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Esqueci minha senha</h1>
      <p className="mb-8 mt-2 text-sm text-muted">
        Informe o e-mail cadastrado e enviaremos um link para você redefinir sua senha.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-sm text-muted">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-ink_text underline underline-offset-2">
          Voltar para o login
        </Link>
      </p>
    </AuthShell>
  );
}
