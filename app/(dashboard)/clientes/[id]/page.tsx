import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: representatives }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("client_representatives")
      .select("id, full_name, cpf, rg, is_principal")
      .eq("client_id", id)
      .order("is_principal", { ascending: false }),
  ]);
  if (!client) notFound();

  const endereco = client.endereco as Record<string, string | null> | null;
  const receitaFederalData = client.receita_federal_data as Record<string, unknown> | null;
  const situacaoCadastral =
    (receitaFederalData?.descricao_situacao_cadastral as string | undefined) ?? null;
  const cnaePrincipal = (receitaFederalData?.cnae_fiscal_descricao as string | undefined) ?? null;
  const situacaoNaoAtiva = situacaoCadastral !== null && situacaoCadastral.toUpperCase() !== "ATIVA";

  return (
    <div className="max-w-xl">
      <span className="rounded-full border border-edge px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
        {client.tipo_pessoa}
      </span>
      <h1 className="mt-3 font-display text-3xl text-ink_text">{client.nome_razao_social}</h1>
      {client.nome_fantasia && <p className="mt-1 text-sm text-muted">{client.nome_fantasia}</p>}

      {situacaoNaoAtiva && (
        <p className="mt-3 rounded-card border border-stamp/30 bg-stamp-tint px-3.5 py-2 text-sm font-semibold text-stamp-dim">
          ⚠ Situação cadastral na Receita Federal: {situacaoCadastral}
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-4 rounded-card border border-edge bg-card px-6 py-5 text-sm shadow-sm shadow-ink-900/5">
        <dt className="text-muted">{client.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}</dt>
        <dd className="font-mono text-ink_text">{formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa)}</dd>

        {client.tipo_pessoa === "PF" && (
          <>
            <dt className="text-muted">RG</dt>
            <dd className="text-ink_text">{client.rg ?? "—"}</dd>
          </>
        )}

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

        {cnaePrincipal && (
          <>
            <dt className="text-muted">CNAE principal</dt>
            <dd className="text-ink_text">{cnaePrincipal}</dd>
          </>
        )}

        <dt className="text-muted">Sincronizado com a Receita Federal</dt>
        <dd className="text-ink_text">
          {client.receita_federal_synced_at
            ? new Date(client.receita_federal_synced_at).toLocaleString("pt-BR")
            : "Não"}
        </dd>
      </dl>

      {client.tipo_pessoa === "PJ" && (
        <div className="mt-6 rounded-card border border-edge bg-card px-6 py-5 shadow-sm shadow-ink-900/5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Representantes legais</p>
          {!representatives?.length ? (
            <p className="mt-2 text-sm text-muted">Nenhum representante cadastrado.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {representatives.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-ink_text">{r.full_name}</span>
                  <span className="font-mono text-xs text-muted">{formatCpfCnpj(r.cpf, "PF")}</span>
                  {r.rg && <span className="text-xs text-muted">RG {r.rg}</span>}
                  {r.is_principal && (
                    <span className="rounded-full border border-edge px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                      Principal
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
