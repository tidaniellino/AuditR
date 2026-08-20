import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "./ContractForm";

export default async function NovoContratoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: clients }, { data: templates }] = await Promise.all([
    supabase.from("clients").select("id, nome_razao_social, tipo_pessoa").order("nome_razao_social"),
    supabase
      .from("contract_templates")
      .select("id, name, contract_type, source_file_name")
      .order("name"),
  ]);

  const docxTemplates = (templates ?? []).filter((t) => t.source_file_name?.toLowerCase().endsWith(".docx"));

  return (
    <div>
      <Link href="/contratos" className="text-xs text-muted hover:text-brand-via">
        ← Contratos
      </Link>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Documentos</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Novo contrato</h1>
      <p className="mb-8 mt-2 max-w-lg text-sm text-muted">
        Escolha o cliente e o modelo — o sistema preenche o documento com os dados do cliente e gera o
        .docx e o .pdf automaticamente.
      </p>

      {!clients?.length ? (
        <p className="text-sm text-muted">
          Nenhum cliente cadastrado ainda —{" "}
          <Link href="/clientes/novo" className="text-brand-via hover:underline">
            cadastre um cliente
          </Link>{" "}
          antes de criar um contrato.
        </p>
      ) : docxTemplates.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhum modelo com arquivo .docx anexado ainda —{" "}
          <Link href="/modelos/novo" className="text-brand-via hover:underline">
            cadastre um modelo
          </Link>{" "}
          com um arquivo .docx (use {"{chave}"} nos trechos que devem ser preenchidos com os dados do
          cliente).
        </p>
      ) : (
        <ContractForm clients={clients} templates={docxTemplates} />
      )}
    </div>
  );
}
