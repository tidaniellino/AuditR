export type ContractStatus = "rascunho" | "em_revisao" | "aguardando_assinatura" | "assinado" | "arquivado";

// "expirado" não é um status gravado no banco (a trilha de transição do
// contrato é rígida: rascunho > em_revisao > aguardando_assinatura > assinado
// > arquivado). É um estado só de exibição: aguardando_assinatura cujo último
// código de assinatura passou do prazo sem ter sido usado.
export type DisplayStatus = ContractStatus | "expirado";

export const STATUS_DISPLAY: Record<DisplayStatus, { label: string; badgeClass: string }> = {
  rascunho: { label: "Não assinado", badgeClass: "border-stamp/40 bg-stamp-tint text-stamp-dim" },
  em_revisao: { label: "Não assinado", badgeClass: "border-stamp/40 bg-stamp-tint text-stamp-dim" },
  aguardando_assinatura: { label: "Aguardando assinatura", badgeClass: "border-info/40 bg-info-tint text-info" },
  assinado: { label: "Assinado", badgeClass: "border-seal/40 bg-seal-tint text-seal" },
  arquivado: { label: "Arquivado", badgeClass: "border-edge bg-mist text-muted" },
  expirado: { label: "Expirado", badgeClass: "border-stamp/40 bg-stamp-tint text-stamp-dim" },
};

/** Resolve o status de exibição, considerando a expiração do código de assinatura. */
export function resolveDisplayStatus(
  status: ContractStatus,
  latestCodeExpiresAt: string | null
): DisplayStatus {
  if (status !== "aguardando_assinatura" || !latestCodeExpiresAt) return status;
  return new Date(latestCodeExpiresAt) < new Date() ? "expirado" : status;
}
