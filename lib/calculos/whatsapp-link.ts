/** Primeiro helper de link wa.me do repo — client-side, sem API, sem
 *  autenticação. Diferente de lib/whatsapp/business.ts (Cloud API, server-side,
 *  usado pro envio de código de assinatura). */
export function buildWhatsAppLink(numero: string, mensagem: string): string {
  const digits = numero.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
}
