import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { TrocarSenhaForm } from "./TrocarSenhaForm";

export default async function TrocarSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AuthShell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Segurança</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Troque sua senha</h1>
      <p className="mb-8 mt-2 text-sm text-muted">
        Por segurança, defina uma nova senha só sua antes de continuar.
      </p>

      <TrocarSenhaForm />
    </AuthShell>
  );
}
