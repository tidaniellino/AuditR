import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContractFileSignedUrl } from "@/lib/storage/contracts";
import { STATUS_DISPLAY, type ContractStatus } from "@/lib/contracts/status";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";
import { formatBRL } from "@/lib/utils";
import { SendForSignatureForm } from "./SendForSignatureForm";
import { FirstContractTracker } from "@/components/contracts/FirstContractTracker";

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "id, title, status, valor, created_at, signed_at, document_hash, generated_docx_path, generated_pdf_path, signed_document_url, signer_ip, signer_user_agent, signer_geolocation, clients(id, nome_razao_social, tipo_pessoa, cpf_cnpj, email), contract_templates(name, contract_type)"
    )
    .eq("id", id)
    .single();

  if (!contract) notFound();

  const client = contract.clients as {
    id: string;
    nome_razao_social: string;
    tipo_pessoa: "PF" | "PJ";
    cpf_cnpj: string;
    email: string | null;
  } | null;
  const template = contract.contract_templates as { name: string; contract_type: string | null } | null;

  const [{ data: history }, docxUrl, pdfUrl, signedUrl] = await Promise.all([
    supabase
      .from("contract_status_history")
      .select("from_status, to_status, changed_at")
      .eq("contract_id", id)
      .order("changed_at", { ascending: true }),
    contract.generated_docx_path ? getContractFileSignedUrl(supabase, contract.generated_docx_path) : null,
    contract.generated_pdf_path ? getContractFileSignedUrl(supabase, contract.generated_pdf_path) : null,
    contract.signed_document_url ? getContractFileSignedUrl(supabase, contract.signed_document_url) : null,
  ]);

  const status = STATUS_DISPLAY[contract.status as ContractStatus];
  const canSend = contract.status !== "assinado" && contract.status !== "arquivado";
  const sendLabel = contract.status === "aguardando_assinatura" ? "Reenviar código" : "Enviar para assinatura";

  return (
    <div className="max-w-2xl">
      <FirstContractTracker />
      <Link href="/contratos" className="text-xs text-muted hover:text-brand-via">
        ← Contratos
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Documentos</p>
          <h1 className="mt-2 font-display text-3xl text-ink_text">{contract.title}</h1>
        </div>
        <span
          className={`mt-1 shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${status.badgeClass}`}
        >
          {status.label}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-3 rounded-card border border-edge bg-card px-6 py-5 text-sm shadow-sm shadow-ink-900/5 sm:grid-cols-2">
        <dt className="text-muted">Cliente</dt>
        <dd className="text-ink_text">{client?.nome_razao_social ?? "—"}</dd>

        <dt className="text-muted">CPF/CNPJ</dt>
        <dd className="font-mono text-ink_text">
          {client ? formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa) : "—"}
        </dd>

        <dt className="text-muted">E-mail</dt>
        <dd className="text-ink_text">{client?.email ?? "—"}</dd>

        <dt className="text-muted">Modelo</dt>
        <dd className="text-ink_text">
          {template?.name ?? "—"} {template?.contract_type ? `· ${template.contract_type}` : ""}
        </dd>

        {contract.valor != null && (
          <>
            <dt className="text-muted">Valor acordado</dt>
            <dd className="text-ink_text">{formatBRL(contract.valor)}</dd>
          </>
        )}

        <dt className="text-muted">Criado em</dt>
        <dd className="text-ink_text">{new Date(contract.created_at).toLocaleString("pt-BR")}</dd>

        {contract.signed_at && (
          <>
            <dt className="text-muted">Assinado em</dt>
            <dd className="text-ink_text">{new Date(contract.signed_at).toLocaleString("pt-BR")}</dd>
          </>
        )}
      </dl>

      <section className="mt-6 rounded-card border border-edge bg-card p-6 shadow-sm shadow-ink-900/5">
        <h2 className="text-sm font-medium text-ink_text">Documentos gerados</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {docxUrl && (
            <a href={docxUrl} className="rounded-card border border-edge px-3.5 py-2 text-sm text-ink_text transition-colors hover:bg-mist">
              Baixar .docx
            </a>
          )}
          {pdfUrl && (
            <a href={pdfUrl} className="rounded-card border border-edge px-3.5 py-2 text-sm text-ink_text transition-colors hover:bg-mist">
              Baixar .pdf
            </a>
          )}
          {signedUrl && (
            <a
              href={signedUrl}
              className="rounded-card border border-seal/40 bg-seal-tint px-3.5 py-2 text-sm font-medium text-seal transition-colors hover:brightness-95"
            >
              Baixar .pdf assinado
            </a>
          )}
        </div>

      </section>

      {contract.status === "assinado" && (
        <section className="mt-6 rounded-card border border-edge bg-card p-6 shadow-sm shadow-ink-900/5">
          <h2 className="text-sm font-medium text-ink_text">Certificado de assinatura eletrônica</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
            <dt className="text-muted">Autenticação</dt>
            <dd className="text-ink_text">Assinatura eletrônica via OTP-Email (MP 2.200-2/2001)</dd>

            {contract.signed_at && (
              <>
                <dt className="text-muted">Assinatura registrada em</dt>
                <dd className="text-ink_text">{new Date(contract.signed_at).toLocaleString("pt-BR")}</dd>
              </>
            )}

            <dt className="text-muted">IP do signatário</dt>
            <dd className="text-ink_text">{contract.signer_ip ?? "Não disponível"}</dd>

            <dt className="text-muted">Geolocalização</dt>
            <dd className="text-ink_text">{contract.signer_geolocation ?? "Não disponível"}</dd>

            {contract.signer_user_agent && (
              <>
                <dt className="text-muted">Navegador</dt>
                <dd className="break-all text-xs text-ink_text">{contract.signer_user_agent}</dd>
              </>
            )}
          </dl>
          {contract.document_hash && (
            <p className="mt-4 break-all font-mono text-[11px] text-muted">
              Hash SHA-256 do documento original: {contract.document_hash}
            </p>
          )}
        </section>
      )}

      {canSend && (
        <section className="mt-6 rounded-card border border-edge bg-card p-6 shadow-sm shadow-ink-900/5">
          <h2 className="text-sm font-medium text-ink_text">Assinatura eletrônica</h2>
          <p className="mt-1 text-xs text-muted">
            Envia um e-mail para o cliente com um código de 6 dígitos, válido por 24 horas, para assinar o
            documento.
          </p>
          <div className="mt-4">
            <SendForSignatureForm contractId={contract.id} label={sendLabel} />
          </div>
        </section>
      )}

      {!!history?.length && (
        <section className="mt-6 rounded-card border border-edge bg-card p-6 shadow-sm shadow-ink-900/5">
          <h2 className="text-sm font-medium text-ink_text">Histórico</h2>
          <div className="mt-3 flex flex-col divide-y divide-edge">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink_text">
                  {h.from_status ? `${STATUS_DISPLAY[h.from_status as ContractStatus].label} → ` : ""}
                  {STATUS_DISPLAY[h.to_status as ContractStatus].label}
                </span>
                <span className="text-xs text-muted">{new Date(h.changed_at).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
