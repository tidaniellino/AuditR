import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export interface ContractMergeData {
  cliente_nome: string;
  cliente_cpf_cnpj: string;
  cliente_email: string;
  cliente_telefone: string;
  cliente_endereco: string;
  contrato_titulo: string;
  contrato_tipo: string;
  contrato_valor: string;
  escritorio_nome: string;
  escritorio_cnpj: string;
  escritorio_endereco: string;
  escritorio_telefone: string;
  escritorio_email: string;
  socio_nome: string;
  data_atual: string;
}

/** Substitui os placeholders {chave} do .docx pelos dados do contrato/cliente. */
export function mergeDocxTemplate(templateBuffer: ArrayBuffer, data: ContractMergeData): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Extrai o texto (por parágrafo) de um .docx já mesclado, para compor o PDF. */
export function extractDocxParagraphs(docxBuffer: Buffer): string[] {
  const zip = new PizZip(docxBuffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";

  const paragraphMatches = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];

  return paragraphMatches
    .map((paragraph) => {
      const runs = paragraph.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [];
      const text = runs
        .map((run) => decodeXmlEntities(run.replace(/<w:t[^>]*>/, "").replace(/<\/w:t>/, "")))
        .join("");
      return text;
    })
    .filter((line) => line.trim().length > 0);
}
