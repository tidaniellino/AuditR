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
export function mergeDocxTemplate(templateBuffer: ArrayBuffer | Buffer, data: ContractMergeData): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Inverso de decodeXmlEntities — usado ao reescrever texto dentro de um
 *  <w:t> (ver template-field-fill.ts). "&" tem que vir primeiro. */
export function encodeXmlEntities(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// PizZip não impõe nenhum limite de tamanho descomprimido — um .docx (é um
// .zip) de poucos MB poderia, em tese, descompactar um único stream deflate
// em vários GB ("zip bomb"), esgotando a memória do processo. Como reforço
// ao limite de upload (ver MAX_TEMPLATE_FILE_BYTES/MAX_LETTERHEAD_FILE_BYTES),
// aborta explicitamente se o XML descompactado passar de um tamanho que
// nenhum contrato real chegaria perto de atingir.
const MAX_DECOMPRESSED_XML_CHARS = 20_000_000;

export function safeAsText(zipObject: PizZip.ZipObject | null | undefined, label: string): string {
  if (!zipObject) return "";
  const text = zipObject.asText();
  if (text.length > MAX_DECOMPRESSED_XML_CHARS) {
    throw new Error(`Arquivo .docx inválido ou corrompido (conteúdo de ${label} excede o tamanho permitido).`);
  }
  return text;
}

function extractParagraphsFromXml(xml: string): string[] {
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

/** Extrai o texto (por parágrafo) de um .docx já mesclado, para compor o PDF. */
export function extractDocxParagraphs(docxBuffer: Buffer): string[] {
  const zip = new PizZip(docxBuffer);
  const xml = safeAsText(zip.file("word/document.xml"), "word/document.xml");
  return extractParagraphsFromXml(xml);
}

export interface DocxLetterheadContent {
  headerLines: string[];
  footerLines: string[];
  logo?: { bytes: Buffer; format: "png" | "jpg" };
}

/** Extrai cabeçalho/rodapé (texto + logo, se houver) de um .docx de papel
 *  timbrado, para desenhar em toda página do PDF gerado (ver
 *  lib/documents/pdf.ts). Usa o primeiro header*.xml/footer*.xml encontrado
 *  no .docx — cobre o caso comum de um modelo com uma única seção. */
export function extractDocxLetterhead(docxBuffer: Buffer): DocxLetterheadContent {
  const zip = new PizZip(docxBuffer);
  const fileNames = Object.keys(zip.files);

  const headerFile = fileNames.filter((n) => /^word\/header\d+\.xml$/.test(n)).sort()[0];
  const footerFile = fileNames.filter((n) => /^word\/footer\d+\.xml$/.test(n)).sort()[0];

  const headerLines = headerFile ? extractParagraphsFromXml(safeAsText(zip.file(headerFile), headerFile)) : [];
  const footerLines = footerFile ? extractParagraphsFromXml(safeAsText(zip.file(footerFile), footerFile)) : [];

  let logo: DocxLetterheadContent["logo"];
  if (headerFile) {
    const relsPath = headerFile.replace(/^word\//, "word/_rels/") + ".rels";
    const relsXml = safeAsText(zip.file(relsPath), relsPath);
    const match = relsXml?.match(/Target="([^"]*\.(png|jpe?g))"/i);
    if (match) {
      const relTarget = match[1].replace(/^\.?\/?/, "");
      const mediaPath = relTarget.startsWith("media/") ? `word/${relTarget}` : relTarget;
      const imgFile = zip.file(mediaPath);
      if (imgFile) {
        logo = {
          bytes: imgFile.asNodeBuffer(),
          format: /\.png$/i.test(relTarget) ? "png" : "jpg",
        };
      }
    }
  }

  return { headerLines, footerLines, logo };
}
