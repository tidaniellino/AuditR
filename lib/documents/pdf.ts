import { createHash } from "crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatCPF } from "@/lib/validation/cpf-cnpj";

const PAGE_MARGIN = 56;
const BODY_SIZE = 10.5;
const LINE_GAP = 5;

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface ContractPartner {
  id: string;
  fullName: string;
  cpf: string | null;
  roleTitle: string | null;
}

export interface ContractPdfInput {
  contractId: string;
  /** Nome real da organização — sempre "Minha Empresa", independente de qual
   *  papel contratual ela ocupa neste contrato. Usado ao lado do nome dos
   *  sócios que assinam. */
  orgName: string;
  /** Papel que a organização ocupa neste contrato específico — muda com o
   *  botão de inverter partes (Prompt 3). Só afeta o rótulo impresso ao
   *  lado da assinatura dos sócios, não a identidade da organização. */
  orgRoleLabel?: "Contratante" | "Contratada";
  orgCity: string | null;
  bodyParagraphs: string[];
  extraClause?: { title: string; content: string } | null;
  partners?: ContractPartner[];
  /** A parte que NÃO é Minha Empresa (cliente, ou Minha Empresa se
   *  invertParties trocar os papéis) — ainda não assinou no momento em que
   *  este PDF é gerado (a assinatura dela é um evento à parte, via OTP por
   *  e-mail), então aqui só entra uma linha de "aguardando". */
  otherParty?: {
    nome: string;
    documento: string;
    role: "Contratante" | "Contratada";
  };
}

/** Código curto e determinístico de "assinado eletronicamente" do sócio — mesmo par
 * contrato+sócio sempre gera o mesmo código, sem precisar persistir nada. */
function partnerSignatureCode(contractId: string, partnerId: string): string {
  return createHash("sha256").update(`${contractId}:${partnerId}`).digest("hex").slice(0, 12).toUpperCase();
}

/** Monta um PDF próprio (não é a conversão do .docx) com os dados do contrato. */
export async function buildContractPdf(input: ContractPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  let y = height - PAGE_MARGIN;
  const maxWidth = width - PAGE_MARGIN * 2;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < PAGE_MARGIN) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      y = height - PAGE_MARGIN;
    }
  };

  const drawText = (text: string, f: PDFFont, size: number, color = rgb(0.11, 0.11, 0.13)) => {
    for (const line of wrapLine(text, f, size, maxWidth)) {
      newPageIfNeeded(size + LINE_GAP);
      page.drawText(line, { x: PAGE_MARGIN, y, size, font: f, color });
      y -= size + LINE_GAP;
    }
  };

  // Sem capa/identificação própria do sistema — o texto do modelo já traz a
  // qualificação completa das partes (preenchida automaticamente), então o
  // documento final começa direto nele, sem repetir nome do escritório,
  // título do modelo ou um resumo de "PARTES" antes.
  for (const paragraph of input.bodyParagraphs) {
    drawText(paragraph, font, BODY_SIZE);
    y -= 4;
  }

  if (input.extraClause) {
    y -= 12;
    newPageIfNeeded(40);
    drawText(input.extraClause.title.toUpperCase(), bold, 11, rgb(0.07, 0.23, 0.37));
    y -= 2;
    drawText(input.extraClause.content, font, BODY_SIZE);
  }

  if (input.partners?.length || input.otherParty) {
    y -= 20;
    newPageIfNeeded(30);
    drawText("ASSINATURAS", bold, 11, rgb(0.07, 0.23, 0.37));
    y -= 6;

    const timestampBR =
      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " BRT";
    const location = input.orgCity ? `${input.orgCity} · ${timestampBR}` : timestampBR;

    for (const partner of input.partners ?? []) {
      newPageIfNeeded(90);
      y -= 18;
      drawText(location, font, 9, rgb(0.42, 0.41, 0.39));
      drawText(partner.fullName, bold, 11);
      y -= 4;
      drawText("_______________________________________", font, BODY_SIZE);
      const roleSuffix = input.orgRoleLabel ? ` (${input.orgRoleLabel})` : "";
      const roleLine = partner.roleTitle
        ? `${partner.roleTitle}${roleSuffix} — ${input.orgName}`
        : `${input.orgName}${roleSuffix}`;
      drawText(roleLine, font, 9, rgb(0.42, 0.41, 0.39));
      if (partner.cpf) drawText(`CPF: ${formatCPF(partner.cpf)}`, font, 9, rgb(0.42, 0.41, 0.39));
      drawText(`Assinado eletronicamente · Cód. ${partnerSignatureCode(input.contractId, partner.id)}`, font, 9, rgb(0.42, 0.41, 0.39));
    }

    // A outra parte assina depois, por um evento à parte (código por
    // e-mail) — neste momento (documento recém-gerado) ainda não assinou.
    // Quando assinar, a Edge Function de assinatura anexa uma confirmação
    // no mesmo formato visual, mais o certificado detalhado, em página à
    // parte (ver supabase/functions/assinatura/index.ts).
    if (input.otherParty) {
      newPageIfNeeded(70);
      y -= 18;
      drawText(input.otherParty.nome, bold, 11);
      y -= 4;
      drawText("_______________________________________", font, BODY_SIZE);
      drawText(`${input.otherParty.role} — ${input.otherParty.documento}`, font, 9, rgb(0.42, 0.41, 0.39));
      drawText("Aguardando assinatura eletrônica", font, 9, rgb(0.42, 0.41, 0.39));
    }
  }

  return pdfDoc.save();
}
