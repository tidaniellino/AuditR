import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";
import { SearchParamsToast } from "@/components/ui/SearchParamsToast";
import { EditClientModal } from "./EditClientModal";
import { DeleteClientButton } from "./DeleteClientButton";
import { ClientActiveToggle } from "./ClientActiveToggle";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select(
      "id, tipo_pessoa, cpf_cnpj, nome_razao_social, nome_fantasia, email, telefone, endereco, active, created_at"
    )
    .order("created_at", { ascending: false });

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

      {!clients?.length ? (
        <div className="rounded-card border border-dashed border-edge bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink_text">Nenhum cliente cadastrado ainda</p>
          <p className="mt-1 text-sm text-muted">Comece cadastrando o primeiro cliente do escritório.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-edge bg-card shadow-sm shadow-ink-900/5">
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
      )}
    </div>
  );
}
