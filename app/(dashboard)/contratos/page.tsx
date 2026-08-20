import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_DISPLAY, type ContractStatus } from "@/lib/contracts/status";

export default async function ContratosPage() {
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, status, created_at, clients(nome_razao_social), contract_templates(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Documentos</p>
          <h1 className="mt-2 font-display text-3xl text-ink_text">Contratos</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Selecione um cliente e um modelo para gerar o contrato em .docx e .pdf, baixe ou envie para
            assinatura por e-mail.
          </p>
        </div>
        <Link
          href="/contratos/novo"
          className="shrink-0 rounded-card bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-via/35"
        >
          + Novo contrato
        </Link>
      </div>

      {!contracts?.length ? (
        <div className="rounded-card border border-dashed border-edge bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink_text">Nenhum contrato gerado ainda</p>
          <p className="mt-1 text-sm text-muted">
            Crie o primeiro contrato a partir de um cliente e um modelo cadastrados.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-edge bg-white shadow-sm shadow-ink-900/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge bg-mist text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const status = STATUS_DISPLAY[c.status as ContractStatus];
                const client = c.clients as { nome_razao_social: string } | null;
                const template = c.contract_templates as { name: string } | null;
                return (
                  <tr key={c.id} className="border-b border-edge last:border-0 hover:bg-mist/60">
                    <td className="px-4 py-3 font-medium text-ink_text">
                      <Link href={`/contratos/${c.id}`} className="hover:text-brand-via">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink_text">{client?.nome_razao_social ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{template?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
