export type ContractStatus = "rascunho" | "em_revisao" | "aguardando_assinatura" | "assinado" | "arquivado";

export const STATUS_DISPLAY: Record<ContractStatus, { label: string; badgeClass: string }> = {
  rascunho: { label: "Não assinado", badgeClass: "border-stamp/40 bg-stamp-tint text-stamp-dim" },
  em_revisao: { label: "Não assinado", badgeClass: "border-stamp/40 bg-stamp-tint text-stamp-dim" },
  aguardando_assinatura: { label: "Enviado para assinatura", badgeClass: "border-info/40 bg-info-tint text-info" },
  assinado: { label: "Assinado", badgeClass: "border-seal/40 bg-seal-tint text-seal" },
  arquivado: { label: "Arquivado", badgeClass: "border-edge bg-mist text-muted" },
};
