import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "./ContractForm";

export default async function NovoContratoPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: templates }, { data: clauses }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nome_razao_social")
      .eq("active", true)
      .order("nome_razao_social", { ascending: true }),
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
      <h1 className="mt-2 font-display text-3xl text-ink_text">Novo contrato</h1>
      <p className="mb-8 mt-2 max-w-lg text-sm text-muted">
        Escolha o cliente e o modelo para gerar o contrato em .docx e .pdf. Você poderá enviar para
        assinatura na tela do contrato depois de gerado.
      </p>
      <ContractForm clients={clients ?? []} templates={templates ?? []} clauses={clauses ?? []} />
    </div>
  );
}
