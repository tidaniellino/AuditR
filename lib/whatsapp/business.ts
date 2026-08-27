const GRAPH_API_VERSION = "v21.0";
const PHONE_ID = process.env.WHATSAPP_BUSINESS_PHONE_ID;
const TOKEN = process.env.WHATSAPP_BUSINESS_API_TOKEN;
const SIGNING_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_SIGNING_NAME ?? "contrato_assinatura";

export function isWhatsAppConfigured(): boolean {
  return Boolean(PHONE_ID && TOKEN);
}

// Normaliza um telefone brasileiro (com ou sem DDI, com ou sem máscara) para o
// formato E.164 sem "+" exigido pela Cloud API do WhatsApp (ex.: 5511999998888).
export function toWhatsAppE164BR(phoneRaw: string): string | null {
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) return null;

  const withCountryCode = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  // DDI (2) + DDD (2) + número (8 ou 9 dígitos) = 12 a 13 dígitos.
  if (withCountryCode.length < 12 || withCountryCode.length > 13) return null;

  return withCountryCode;
}

async function sendTemplateMessage({
  to,
  templateName,
  languageCode = "pt_BR",
  bodyParams,
  buttonUrlParam,
}: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams: string[];
  buttonUrlParam?: string;
}): Promise<void> {
  if (!isWhatsAppConfigured()) {
    throw new Error(
      "WhatsApp Business não está configurado (WHATSAPP_BUSINESS_API_TOKEN / WHATSAPP_BUSINESS_PHONE_ID)."
    );
  }

  const components: Record<string, unknown>[] = [
    {
      type: "body",
      parameters: bodyParams.map((text) => ({ type: "text", text })),
    },
  ];

  if (buttonUrlParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonUrlParam }],
    });
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `Falha ao enviar mensagem no WhatsApp (HTTP ${res.status}).`;
    throw new Error(message);
  }
}

// Envia o código de assinatura por WhatsApp usando um template pré-aprovado no
// Meta Business Manager (mensagens de negócio fora da janela de 24h exigem
// template — não é possível mandar texto livre). O template precisa ter um
// corpo com 3 variáveis, nessa ordem — nome do cliente, título do contrato,
// código — e um botão de URL dinâmica cujo sufixo é "assinar/{id}" (a URL
// base fica fixa na configuração do template). Nome do template configurável
// via WHATSAPP_TEMPLATE_SIGNING_NAME.
export async function sendSigningWhatsAppMessage({
  to,
  clientName,
  contractTitle,
  code,
  contractId,
}: {
  to: string;
  clientName: string;
  contractTitle: string;
  code: string;
  contractId: string;
}): Promise<void> {
  const recipient = toWhatsAppE164BR(to);
  if (!recipient) throw new Error("Telefone do cliente inválido para envio por WhatsApp.");

  await sendTemplateMessage({
    to: recipient,
    templateName: SIGNING_TEMPLATE_NAME,
    bodyParams: [clientName, contractTitle, code],
    buttonUrlParam: `assinar/${contractId}`,
  });
}
