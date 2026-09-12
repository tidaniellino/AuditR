import PizZip from "pizzip";
import { decodeXmlEntities, encodeXmlEntities } from "./docx";

/**
 * Substitui, no .docx original (antes do merge de {chave}), cada ocorrência
 * de "[TEXTO]" cujo índice global apareça em `valuesByOccurrence` pelo valor
 * resolvido — na posição exata daquela ocorrência, não em todas as
 * ocorrências daquele texto (a mesma etiqueta "[RAZÃO SOCIAL DA EMPRESA]"
 * pode aparecer uma vez no bloco Contratante e outra no bloco Contratada,
 * com valores diferentes).
 *
 * A numeração de occurrenceIndex aqui precisa bater exatamente com a usada
 * por analyzeTemplateFields (lib/documents/template-fields.ts) — mesma
 * ordem de varredura (parágrafo por parágrafo, esquerda pra direita), mesmo
 * filtro de parágrafo vazio que extractDocxParagraphs usa — já que é dali
 * que vem o occurrence_index salvo em template_field_occurrences.
 *
 * Ocorrências sem valor no mapa (campo específico do contrato, ou sem
 * atributo mapeado) ficam como estavam — "[...]" continua visível para
 * preenchimento manual, como já é hoje.
 */
export function fillBracketFields(docxBuffer: Buffer, valuesByOccurrence: Map<number, string>): Buffer {
  const zip = new PizZip(docxBuffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  if (!xml || valuesByOccurrence.size === 0) return docxBuffer;

  interface Run {
    xmlStart: number;
    xmlEnd: number;
    attrs: string;
    decoded: string;
    textStart: number;
  }
  interface Bracket {
    start: number;
    end: number;
    value: string;
  }

  const paragraphRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const runRe = /<w:t([^>]*)>([\s\S]*?)<\/w:t>/g;

  const edits: { xmlStart: number; xmlEnd: number; newXml: string }[] = [];
  let occurrenceIndex = 0;

  let pMatch: RegExpExecArray | null;
  while ((pMatch = paragraphRe.exec(xml))) {
    const paragraphXml = pMatch[0];
    const paragraphAbsoluteStart = pMatch.index;

    const runs: Run[] = [];
    let textCursor = 0;
    runRe.lastIndex = 0;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = runRe.exec(paragraphXml))) {
      const decoded = decodeXmlEntities(rMatch[2]);
      runs.push({
        xmlStart: paragraphAbsoluteStart + rMatch.index,
        xmlEnd: paragraphAbsoluteStart + rMatch.index + rMatch[0].length,
        attrs: rMatch[1],
        decoded,
        textStart: textCursor,
      });
      textCursor += decoded.length;
    }

    const paragraphText = runs.map((r) => r.decoded).join("");
    // Mesmo filtro que extractDocxParagraphs usa pra decidir se o parágrafo
    // "conta" — precisa bater pra occurrenceIndex não desalinhar.
    if (!paragraphText.trim()) continue;

    const brackets: Bracket[] = [];
    for (const m of paragraphText.matchAll(/\[([^[\]]+)\]/g)) {
      const currentIndex = occurrenceIndex++;
      const value = valuesByOccurrence.get(currentIndex);
      if (value === undefined) continue;
      brackets.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, value });
    }
    if (brackets.length === 0) continue;

    for (const run of runs) {
      const runTextStart = run.textStart;
      const runTextEnd = runTextStart + run.decoded.length;
      const overlapping = brackets.filter((b) => b.start < runTextEnd && b.end > runTextStart);
      if (overlapping.length === 0) continue;

      let newDecoded = "";
      let localCursor = 0;
      for (const b of overlapping) {
        const overlapStart = Math.max(b.start, runTextStart) - runTextStart;
        const overlapEnd = Math.min(b.end, runTextEnd) - runTextStart;
        newDecoded += run.decoded.slice(localCursor, overlapStart);
        // Só insere o valor no run onde o campo COMEÇA — se o campo se
        // espalha por mais de um run, os seguintes só têm a parte coberta
        // removida, sem repetir o valor.
        if (b.start >= runTextStart) newDecoded += b.value;
        localCursor = overlapEnd;
      }
      newDecoded += run.decoded.slice(localCursor);

      const attrs = run.attrs.includes("xml:space") ? run.attrs : `${run.attrs} xml:space="preserve"`;
      edits.push({
        xmlStart: run.xmlStart,
        xmlEnd: run.xmlEnd,
        newXml: `<w:t${attrs}>${encodeXmlEntities(newDecoded)}</w:t>`,
      });
    }
  }

  if (edits.length === 0) return docxBuffer;

  edits.sort((a, b) => a.xmlStart - b.xmlStart);
  let result = "";
  let cursor = 0;
  for (const edit of edits) {
    result += xml.slice(cursor, edit.xmlStart);
    result += edit.newXml;
    cursor = edit.xmlEnd;
  }
  result += xml.slice(cursor);

  zip.file("word/document.xml", result);
  return zip.generate({ type: "nodebuffer" });
}
