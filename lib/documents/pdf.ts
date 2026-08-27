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
  templateName: string;
  orgName: string;
  orgCity: string | null;
  contractType: string | null;
  clientName: string;
  clientDocument: string;
  clientEmail: string | null;
  bodyParagraphs: string[];
  extraClause?: { title: string; content: string } | null;
  partners?: ContractPartner[];
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

  drawText(input.orgName, bold, 10, rgb(0.07, 0.23, 0.37));
  y -= 6;
  drawText(input.templateName.toUpperCase(), bold, 15);
  if (input.contractType) drawText(input.contractType, font, 10, rgb(0.42, 0.41, 0.39));
  y -= 10;

  drawText("PARTES", bold, 11, rgb(0.07, 0.23, 0.37));
  drawText(`Contratante: ${input.orgName}`, font, BODY_SIZE);
  drawText(`Contratado(a): ${input.clientName}`, font, BODY_SIZE);
  drawText(`CPF/CNPJ: ${input.clientDocument}`, font, BODY_SIZE);
  if (input.clientEmail) drawText(`E-mail: ${input.clientEmail}`, font, BODY_SIZE);
  y -= 10;

  drawText("TEXTO DO CONTRATO", bold, 11, rgb(0.07, 0.23, 0.37));
  y -= 2;
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

  if (input.partners?.length) {
    y -= 20;
    newPageIfNeeded(30);
    drawText("ASSINATURAS", bold, 11, rgb(0.07, 0.23, 0.37));
    y -= 6;

    const timestampBR =
      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " BRT";
    const location = input.orgCity ? `${input.orgCity} · ${timestampBR}` : timestampBR;

    for (const partner of input.partners) {
      newPageIfNeeded(90);
      y -= 18;
      drawText(location, font, 9, rgb(0.42, 0.41, 0.39));
      drawText(partner.fullName, bold, 11);
      y -= 4;
      drawText("_______________________________________", font, BODY_SIZE);
      const roleLine = partner.roleTitle ? `${partner.roleTitle} — ${input.orgName}` : input.orgName;
      drawText(roleLine, font, 9, rgb(0.42, 0.41, 0.39));
      if (partner.cpf) drawText(`CPF: ${formatCPF(partner.cpf)}`, font, 9, rgb(0.42, 0.41, 0.39));
      drawText(`Assinado eletronicamente · Cód. ${partnerSignatureCode(input.contractId, partner.id)}`, font, 9, rgb(0.42, 0.41, 0.39));
    }
  }

  return pdfDoc.save();
}
