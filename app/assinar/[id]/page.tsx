import { notFound } from "next/navigation";
import { callSigningFunction } from "@/lib/supabase/functions";
import { SignForm } from "./SignForm";

interface SigningInfo {
  title: string;
  orgName: string;
  status: string;
  signerName: string | null;
  hasValidCode: boolean;
  codeExpired: boolean;
  pdfUrl: string | null;
}

export default async function AssinarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await callSigningFunction<SigningInfo>({ action: "info", contract_id: id });

  if (!result.ok) {
    if (result.error === "not_found") notFound();
    throw new Error(result.error);
  }

  const info = result.data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-edge bg-card p-8 shadow-xl shadow-ink-900/5">
        <div className="mb-6 h-1.5 w-12 rounded-full bg-brand-via" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{info.orgName}</p>
        <h1 className="mt-2 font-display text-2xl text-ink_text">{info.title}</h1>

        <div className="mt-6">
          {info.status === "assinado" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-seal-tint text-seal">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm text-muted">Este documento já foi assinado.</p>
              {info.pdfUrl && (
                <a
                  href={info.pdfUrl}
                  className="mt-1 rounded-card border border-edge px-3.5 py-2 text-sm text-ink_text transition-colors hover:bg-mist"
                >
                  Baixar contrato assinado (.pdf)
                </a>
              )}
            </div>
          ) : info.status !== "aguardando_assinatura" ? (
            <p className="py-4 text-center text-sm text-muted">
              Este contrato ainda não foi enviado para assinatura. Entre em contato com o escritório.
            </p>
          ) : info.codeExpired ? (
            <p className="py-4 text-center text-sm text-muted">
              O código de assinatura expirou. Peça ao escritório para reenviar o contrato.
            </p>
          ) : !info.hasValidCode ? (
            <p className="py-4 text-center text-sm text-muted">
              Nenhum código de assinatura ativo para este contrato. Peça ao escritório para enviá-lo.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {info.pdfUrl && (
                <a
                  href={info.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-card border border-edge px-3.5 py-2.5 text-sm text-ink_text transition-colors hover:bg-mist"
                >
                  Baixar contrato para conferência (.pdf)
                </a>
              )}
              <SignForm contractId={id} signerName={info.signerName} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
