/** Checagem pelos primeiros bytes do arquivo (magic numbers) — extensão e
 *  `file.type` são só o que o navegador reporta, então totalmente
 *  forjáveis por quem está enviando o arquivo (ex.: renomear um .html com
 *  payload de script pra "modelo.docx"). Isso confirma que o CONTEÚDO
 *  realmente é do formato esperado antes de aceitar o upload. */

const DOCX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04" — cabeçalho local de um ZIP (.docx é um .zip)
const DOCX_EMPTY_ZIP_SIGNATURE = [0x50, 0x4b, 0x05, 0x06]; // arquivo zip vazio, variante rara mas válida
const DOC_OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // .doc legado (OLE2/CFBF)
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

async function readMagicBytes(file: File, length: number): Promise<Uint8Array> {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

/** Só o formato novo (.docx / zip) — usado onde o resto do pipeline exige
 *  especificamente .docx (papel timbrado, geração de contrato). */
export async function hasDocxMagicBytes(file: File): Promise<boolean> {
  const bytes = await readMagicBytes(file, 4);
  return matchesSignature(bytes, DOCX_SIGNATURE) || matchesSignature(bytes, DOCX_EMPTY_ZIP_SIGNATURE);
}

/** .docx (zip) OU o .doc legado (OLE2) — usado onde a extensão .doc ainda é
 *  aceita no upload (mesmo sabendo que a geração de contrato exige .docx). */
export async function hasWordDocumentMagicBytes(file: File): Promise<boolean> {
  const bytes = await readMagicBytes(file, 8);
  return (
    matchesSignature(bytes, DOCX_SIGNATURE) ||
    matchesSignature(bytes, DOCX_EMPTY_ZIP_SIGNATURE) ||
    matchesSignature(bytes, DOC_OLE2_SIGNATURE)
  );
}

export async function hasImageMagicBytes(file: File): Promise<boolean> {
  const bytes = await readMagicBytes(file, 12);
  if (matchesSignature(bytes, PNG_SIGNATURE)) return true;
  if (matchesSignature(bytes, JPEG_SIGNATURE)) return true;
  // WEBP: contêiner RIFF ("RIFF" + tamanho de 4 bytes + "WEBP")
  if (
    matchesSignature(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
}
