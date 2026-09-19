import { createClient } from "@/lib/supabase/server";
import { getTemplateFileSignedUrl } from "@/lib/storage/templates";
import { ContractForm } from "./ContractForm";

export default async function NovoContratoPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: templates }, { data: clauses }, { data: representatives }, { data: org }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, tipo_pessoa, cpf_cnpj, nome_razao_social, nome_fantasia, rg, endereco")
        .eq("active", true)
        .order("nome_razao_social", { ascending: true }),
      supabase
        .from("contract_templates")
        .select("id, name, contract_type, is_system_default, source_file_path")
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("clauses")
        .select("id, title")
        .eq("status", "approved")
        .order("title", { ascending: true }),
      supabase
        .from("client_representatives")
        .select("client_id, full_name, cpf, rg, is_principal")
        .order("is_principal", { ascending: false }),
      supabase.from("organizations").select("letterhead_file_path").single(),
    ]);

  const representativeByClient = new Map<string, { full_name: string; cpf: string; rg: string | null }>();
  for (const rep of representatives ?? []) {
    if (!representativeByClient.has(rep.client_id)) {
      representativeByClient.set(rep.client_id, { full_name: rep.full_name, cpf: rep.cpf, rg: rep.rg });
    }
  }

  const templatePreviewUrls = new Map(
    await Promise.all(
      (templates ?? [])
        .filter((t) => t.source_file_path)
        .map(async (t) => [t.id, await getTemplateFileSignedUrl(supabase, t.source_file_path!)] as const)
    )
  );

  const templatesWithPreview = (templates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    contract_type: t.contract_type,
    is_system_default: t.is_system_default,
    previewUrl: templatePreviewUrls.get(t.id) ?? null,
  }));

  const clientsWithDetails = (clients ?? []).map((c) => ({
    id: c.id,
    tipo_pessoa: c.tipo_pessoa,
    cpf_cnpj: c.cpf_cnpj,
    nome_razao_social: c.nome_razao_social,
    nome_fantasia: c.nome_fantasia,
    rg: c.rg,
    endereco: c.endereco as Record<string, string | null> | null,
    representante: representativeByClient.get(c.id) ?? null,
  }));

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Documentos</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Novo contrato</h1>
      <p className="mb-8 mt-2 max-w-lg text-sm text-muted">
        Escolha o cliente e o modelo para gerar o contrato em .docx e .pdf. Você poderá enviar para
        assinatura na tela do contrato depois de gerado.
      </p>
      <ContractForm
        clients={clientsWithDetails}
        templates={templatesWithPreview}
        clauses={clauses ?? []}
        hasLetterhead={Boolean(org?.letterhead_file_path)}
      />
    </div>
  );
}
