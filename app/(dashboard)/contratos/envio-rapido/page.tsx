import { createClient } from "@/lib/supabase/server";
import { QuickSendForm } from "./QuickSendForm";

export default async function EnvioRapidoPage() {
  const supabase = await createClient();

  const [{ data: templates }, { data: clauses }] = await Promise.all([
    supabase
      .from("contract_templates")
      .select("id, name, contract_type")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("clauses")
      .select("id, title")
      .eq("status", "approved")
      .order("title", { ascending: true }),
  ]);

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Documentos</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Envio rápido</h1>
      <p className="mb-8 mt-2 max-w-lg text-sm text-muted">
        Selecione um modelo ou envie um contrato já pronto, informe os dados do contratante e envie
        direto para assinatura — sem precisar cadastrar o cliente antes.
      </p>
      <QuickSendForm templates={templates ?? []} clauses={clauses ?? []} />
    </div>
  );
}
