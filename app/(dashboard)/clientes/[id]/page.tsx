import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const endereco = client.endereco as Record<string, string | null> | null;

  return (
    <div className="max-w-xl">
      <span className="rounded-full border border-edge px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
        {client.tipo_pessoa}
      </span>
      <h1 className="mt-3 font-display text-3xl text-ink_text">{client.nome_razao_social}</h1>
      {client.nome_fantasia && <p className="mt-1 text-sm text-muted">{client.nome_fantasia}</p>}

      <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-4 rounded-card border border-edge bg-card px-6 py-5 text-sm shadow-sm shadow-ink-900/5">
        <dt className="text-muted">{client.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}</dt>
        <dd className="font-mono text-ink_text">{formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa)}</dd>

        <dt className="text-muted">E-mail</dt>
        <dd className="text-ink_text">{client.email ?? "—"}</dd>

        <dt className="text-muted">Telefone</dt>
        <dd className="text-ink_text">{client.telefone ?? "—"}</dd>

        {endereco && (
          <>
            <dt className="text-muted">Endereço</dt>
            <dd className="text-ink_text">
              {[endereco.logradouro, endereco.numero].filter(Boolean).join(", ")}
              {endereco.complemento ? ` - ${endereco.complemento}` : ""}
              <br />
              {[endereco.bairro, endereco.municipio, endereco.uf].filter(Boolean).join(" - ")}
              {endereco.cep ? ` · CEP ${endereco.cep}` : ""}
            </dd>
          </>
        )}

        <dt className="text-muted">Sincronizado com a Receita Federal</dt>
        <dd className="text-ink_text">
          {client.receita_federal_synced_at
            ? new Date(client.receita_federal_synced_at).toLocaleString("pt-BR")
            : "Não"}
        </dd>
      </dl>
    </div>
  );
}
