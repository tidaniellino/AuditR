import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";
import { ClauseForm } from "./ClauseForm";

export default async function NovaClausulaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canEditClauses(profile?.role as UserRole | undefined)) {
    redirect("/acesso-negado");
  }

  const { data: categories } = await supabase
    .from("clause_categories")
    .select("id, name")
    .order("name");

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Biblioteca</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Nova cláusula</h1>
      <p className="mb-8 mt-2 max-w-lg text-sm text-muted">
        O conteúdo abaixo vira a versão v1.0. Alterações futuras geram novas versões sem apagar o
        histórico.
      </p>
      <ClauseForm categories={categories ?? []} />
    </div>
  );
}
