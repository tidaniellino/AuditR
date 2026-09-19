import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { SearchParamsToast } from "@/components/ui/SearchParamsToast";
import { SearchFilterBar } from "@/components/ui/SearchFilterBar";
import { EditClientModal } from "./EditClientModal";
import { DeleteClientButton } from "./DeleteClientButton";
import { ClientActiveToggle } from "./ClientActiveToggle";
import { QuickSendContractButton } from "./QuickSendContractButton";
import { getTemplateFileSignedUrl } from "@/lib/storage/templates";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const supabase = await createClient();
  const { q, tipo } = await searchParams;

  let clientsQuery = supabase
    .from("clients")
    .select(
      "id, tipo_pessoa, cpf_cnpj, nome_razao_social, nome_fantasia, email, telefone, endereco, rg, active, created_at"
    )
    .order("created_at", { ascending: false });

  if (q?.trim()) {
    const term = q.trim().replace(/,/g, " ");
    const digits = onlyDigits(term);
    const orConditions = [`nome_razao_social.ilike.%${term}%`, `nome_fantasia.ilike.%${term}%`];
    if (digits) orConditions.push(`cpf_cnpj.ilike.%${digits}%`);
    clientsQuery = clientsQuery.or(orConditions.join(","));
  }
  if (tipo === "PF" || tipo === "PJ") {
    clientsQuery = clientsQuery.eq("tipo_pessoa", tipo);
  }

  const [{ data: clients }, { data: templates }, { data: clauses }, { data: representatives }] = await Promise.all([
    clientsQuery,
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
      .select("id, client_id, full_name, cpf, rg, is_principal")
      .order("is_principal", { ascending: false }),
  ]);

  type RepresentativeRow = { id: string; client_id: string; full_name: string; cpf: string; rg: string | null; is_principal: boolean };
  const representativesByClient = new Map<string, RepresentativeRow[]>();
  for (const rep of (representatives ?? []) as RepresentativeRow[]) {
    const list = representativesByClient.get(rep.client_id) ?? [];
    list.push(rep);
    representativesByClient.set(rep.client_id, list);
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

  return (
    <div>
      <SearchParamsToast />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Cadastro</p>
          <h1 className="mt-2 font-display text-3xl text-ink_text">Clientes</h1>
          <p className="mt-2 text-sm text-muted">Cadastro centralizado de clientes PF/PJ.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/clientes/novo"
            className="shrink-0 rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35"
          >
            + Novo cliente
          </Link>
        </div>
      </div>

      <SearchFilterBar
        basePath="/clientes"
        searchPlaceholder="Buscar por nome, razão social ou CPF/CNPJ..."
        currentQuery={q}
        filterParamName="tipo"
        filterLabel="Todos os tipos"
        filterOptions={[
          { value: "PF", label: "Pessoa Física" },
          { value: "PJ", label: "Pessoa Jurídica" },
        ]}
        currentFilter={tipo}
      />

      {!clients?.length ? (
        <div className="rounded-card border border-dashed border-edge bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink_text">
            {q || tipo ? "Nenhum cliente encontrado para essa busca" : "Nenhum cliente cadastrado ainda"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {q || tipo ? "Tente ajustar os termos ou limpar os filtros." : "Comece cadastrando o primeiro cliente do escritório."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-edge bg-card shadow-sm shadow-ink-900/5">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge bg-mist text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Nome / Razão social</th>
                <th className="px-4 py-3 font-medium">CPF/CNPJ</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-edge last:border-0 hover:bg-mist/60">
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="font-medium text-ink_text hover:underline">
                      {c.nome_razao_social}
                    </Link>
                    {c.nome_fantasia && <p className="text-xs text-muted">{c.nome_fantasia}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink_text">
                    {formatCpfCnpj(c.cpf_cnpj, c.tipo_pessoa)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink_text">{c.email ?? "—"}</p>
                    <p className="text-xs text-muted">{c.telefone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-edge px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                      {c.tipo_pessoa}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ClientActiveToggle clientId={c.id} active={c.active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <QuickSendContractButton
                        client={{
                          id: c.id,
                          tipo_pessoa: c.tipo_pessoa,
                          cpf_cnpj: c.cpf_cnpj,
                          nome_razao_social: c.nome_razao_social,
                          email: c.email,
                          telefone: c.telefone,
                        }}
                        templates={templatesWithPreview}
                        clauses={clauses ?? []}
                      />
                      <EditClientModal
                        client={{
                          id: c.id,
                          tipo_pessoa: c.tipo_pessoa,
                          cpf_cnpj: c.cpf_cnpj,
                          nome_razao_social: c.nome_razao_social,
                          nome_fantasia: c.nome_fantasia,
                          email: c.email,
                          telefone: c.telefone,
                          endereco: c.endereco as Record<string, string | null> | null,
                          rg: c.rg,
                          representatives: representativesByClient.get(c.id) ?? [],
                        }}
                      />
                      <DeleteClientButton clientId={c.id} clientName={c.nome_razao_social} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
