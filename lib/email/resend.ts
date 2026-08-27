import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "AuditR Contratos <onboarding@resend.dev>";

export async function sendSigningEmail({
  to,
  clientName,
  contractTitle,
  code,
  signUrl,
}: {
  to: string;
  clientName: string;
  contractTitle: string;
  code: string;
  signUrl: string;
}) {
  const text = `Olá, ${clientName}!

Você recebeu um novo contrato: "${contractTitle}".

Clique no link abaixo para assinatura e insira o código ${code} para assinar o documento.
${signUrl}

O código tem um prazo de 24 horas. Depois do prazo é necessário solicitar o reenvio do contrato.`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #1C1D22;">
      <p>Olá, <strong>${escapeHtml(clientName)}</strong>!</p>
      <p>Você recebeu um novo contrato: <strong>${escapeHtml(contractTitle)}</strong>.</p>
      <p>Clique no botão abaixo para assinatura e insira o código para assinar o documento:</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${signUrl}" style="background:#1D4E89; color:#fff; padding: 12px 24px; border-radius: 10px; text-decoration:none; font-weight:600; display:inline-block;">
          Assinar contrato
        </a>
      </p>
      <p style="text-align:center; font-size: 28px; letter-spacing: 6px; font-weight: 700; font-family: ui-monospace, monospace;">
        ${escapeHtml(code)}
      </p>
      <p style="color:#6B6A63; font-size: 13px;">
        O código tem um prazo de 24 horas. Depois do prazo é necessário solicitar o reenvio do contrato.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Contrato para assinatura: ${contractTitle}`,
    text,
    html,
  });

  if (error) throw new Error(error.message);
}

export async function sendInviteEmail({
  to,
  orgName,
  roleLabel,
  inviteUrl,
}: {
  to: string;
  orgName: string;
  roleLabel: string;
  inviteUrl: string;
}) {
  const text = `Olá!

Você foi convidado(a) para acessar o ${orgName} no AuditR Contratos, com o perfil de ${roleLabel}.

Clique no link abaixo para criar sua senha e acessar o sistema:
${inviteUrl}

O convite tem um prazo de 7 dias.`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #1C1D22;">
      <p>Olá!</p>
      <p>Você foi convidado(a) para acessar o <strong>${escapeHtml(orgName)}</strong> no AuditR Contratos, com o perfil de <strong>${escapeHtml(roleLabel)}</strong>.</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${inviteUrl}" style="background:#1D4E89; color:#fff; padding: 12px 24px; border-radius: 10px; text-decoration:none; font-weight:600; display:inline-block;">
          Criar acesso
        </a>
      </p>
      <p style="color:#6B6A63; font-size: 13px;">O convite tem um prazo de 7 dias.</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Convite para acessar o ${orgName}`,
    text,
    html,
  });

  if (error) throw new Error(error.message);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
