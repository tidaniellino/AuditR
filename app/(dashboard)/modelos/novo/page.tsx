import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";
import { TemplateForm } from "./TemplateForm";

// O middleware já bloqueia esta rota para perfis júnior; esta checagem
// server-side é a segunda camada de defesa (ex.: chamadas diretas de API).
export default async function NovoModeloPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canEditClauses(profile?.role as UserRole | undefined)) {
    redirect("/acesso-negado");
  }

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Modelos</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Novo modelo</h1>
      <p className="mb-8 mt-2 text-sm text-muted">
        Envie o arquivo-modelo que servirá de base para este tipo de contrato. Depois de salvar, você
        pode anexar campos do formulário dinâmico e cláusulas da biblioteca a ele.
      </p>
      <TemplateForm />
    </div>
  );
}
