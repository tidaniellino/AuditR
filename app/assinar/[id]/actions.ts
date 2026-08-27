"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { callSigningFunction } from "@/lib/supabase/functions";

export interface VerifyState {
  error?: string;
  success?: boolean;
  documentHash?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code_format: "Digite os 6 números do código recebido por e-mail.",
  contract_not_awaiting_signature: "Este contrato não está mais aguardando assinatura.",
  no_code: "Nenhum código foi enviado para este contrato ainda.",
  already_used: "Este código já foi utilizado.",
  expired: "O código expirou. Peça ao escritório para reenviar o contrato.",
  too_many_attempts: "Muitas tentativas incorretas. Peça ao escritório para reenviar o contrato.",
  wrong_code: "Código incorreto. Confira o e-mail e tente novamente.",
  missing_document: "O documento deste contrato não foi encontrado.",
  document_download_failed: "Não foi possível carregar o documento. Tente novamente.",
  upload_failed: "Não foi possível salvar o documento assinado. Tente novamente.",
  not_found: "Contrato não encontrado.",
};

export async function verifySigningCode(
  _prevState: VerifyState | undefined,
  formData: FormData
): Promise<VerifyState> {
  const contractId = String(formData.get("contract_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!contractId) return { error: "Contrato não encontrado." };
  if (!/^\d{6}$/.test(code)) return { error: "Digite os 6 números do código recebido por e-mail." };

  const h = await headers();
  // x-forwarded-for pode trazer uma lista "cliente, proxy1, proxy2" — o
  // primeiro endereço é o do visitante original.
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent") || null;

  const result = await callSigningFunction<{ ok: true; documentHash: string }>({
    action: "verify",
    contract_id: contractId,
    code,
    ip,
    userAgent,
  });

  if (!result.ok) {
    return { error: ERROR_MESSAGES[result.error] ?? "Não foi possível assinar o documento. Tente novamente." };
  }

  revalidatePath(`/assinar/${contractId}`);
  return { success: true, documentHash: result.data.documentHash };
}
