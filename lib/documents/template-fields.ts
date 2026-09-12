/**
 * Identificação e classificação de campos "[TEXTO ENTRE COLCHETES]" em
 * modelos de contrato. Cada OCORRÊNCIA é classificada como pertencente à
 * parte Contratante, Contratada, ou "campo específico do contrato" (sem
 * correspondência cadastral — valor, prazo, foro, etc.), usando a posição
 * relativa aos rótulos "CONTRATANTE"/"CONTRATADA" no texto.
 *
 * Escopo desta entrega: só reconhece o padrão "[...]" (colchetes) e só
 * classifica em Contratante/Contratada/específico — sem papéis extras
 * (interveniente, avalista, testemunha), por decisão explícita do usuário.
 * O preenchimento em si dos valores fica fora de escopo: esta função só
 * identifica e sugere a classificação.
 */

export type TemplateFieldRole = "contratante" | "contratada" | "especifico";
export type TemplateFieldConfidence = "high" | "low";

export interface TemplateFieldOccurrence {
  occurrenceIndex: number;
  rawText: string;
  paragraphIndex: number;
  contextSnippet: string;
  role: TemplateFieldRole;
  attributeKey: string | null;
  confidence: TemplateFieldConfidence;
}

/** Atributos do cadastro que um campo Contratante/Contratada pode mapear —
 *  mesma convenção de chaves usada em generateContract (contratos/actions.ts). */
export const PARTY_ATTRIBUTE_LABELS: Record<string, string> = {
  nome: "Nome / Razão social",
  nome_fantasia: "Nome fantasia",
  documento: "CPF/CNPJ",
  endereco: "Endereço",
  rg: "RG",
  telefone: "Telefone",
  email: "E-mail",
  representante_nome: "Nome do representante legal",
  representante_cpf: "CPF do representante legal",
  representante_rg: "RG do representante legal",
};

const BRACKET_RE = /\[([^[\]]+)\]/g;
// Exige que o rótulo apareça no INÍCIO do parágrafo (com ou sem ":" depois)
// — cobre tanto o bloco de qualificação ("CONTRATANTE: [RAZÃO SOCIAL]...")
// quanto o bloco de assinatura, onde o rótulo fica sozinho numa linha e os
// campos vêm no parágrafo seguinte ("CONTRATANTE" \n "[RAZÃO SOCIAL] –
// [NOME DO REPRESENTANTE]"). Não casa uma menção em prosa no meio de uma
// cláusula ("a CONTRATANTE pagará à CONTRATADA..."), que não deve reiniciar
// a zona da parte.
const CONTRATANTE_LABEL_RE = /^\s*CONTRATANTE(?:\s*\(S\))?\s*:?/gi;
const CONTRATADA_LABEL_RE = /^\s*CONTRATADA(?:\s*\(S\))?\s*:?/gi;

// Heurística de "início de cláusula" — reinicia a zona de qualificação da
// parte, pra um campo lá na cláusula 5 (ex.: [VALOR DO CONTRATO]) não ser
// erroneamente herdado do último rótulo de parte visto no texto.
const CLAUSE_BOUNDARY_RE =
  /^\s*(CL[ÁA]USULA|PAR[ÁA]GRAFO\s|CAP[ÍI]TULO|OBJETO\b|DO\s+OBJETO|DAS?\s+[A-ZÀ-Ú]|ART(?:IGO)?\.?\s*\d|\d+\s*[.)-]\s)/i;

type Event =
  | { type: "label"; role: "contratante" | "contratada"; pos: number; paragraphIndex: number }
  | { type: "boundary"; pos: number; paragraphIndex: number }
  | { type: "field"; rawText: string; pos: number; paragraphIndex: number; paragraphText: string };

/** Tenta reconhecer a qual atributo de cadastro um campo corresponde, pelo
 *  texto descritivo (ex.: "RAZÃO SOCIAL") ou por máscara de formato (ex.:
 *  "00.000.000/0000-00" → CNPJ). Retorna um marcador ambíguo para CPF/RG
 *  quando a resolução depende do contexto (representante vs a própria
 *  parte) — resolvido depois em analyzeTemplateFields. */
function guessAttribute(rawText: string): string | null {
  const trimmed = rawText.trim();
  const upper = trimmed.toUpperCase();
  const digitsOnly = trimmed.replace(/\D/g, "");

  // Máscaras de documento com zeros de exemplo, ex.: "00.000.000/0000-00".
  if (/^\d[\d./-]*\d$/.test(trimmed)) {
    if (trimmed.includes("/") && digitsOnly.length === 14) return "documento"; // CNPJ
    if (digitsOnly.length === 11) return "documento_ou_representante_cpf";
    if (digitsOnly.length === 9) return "rg_ou_representante_rg";
  }

  if (/RAZ[ÃA]O SOCIAL|NOME DA EMPRESA|DENOMINA[ÇC][ÃA]O SOCIAL/.test(upper)) return "nome";
  if (/NOME FANTASIA/.test(upper)) return "nome_fantasia";
  if (/REPRESENTANTE/.test(upper)) {
    if (/CPF/.test(upper)) return "representante_cpf";
    if (/\bRG\b/.test(upper)) return "representante_rg";
    return "representante_nome";
  }
  if (/ENDERE[ÇC]O|SEDE\b/.test(upper)) return "endereco";
  if (/\bCNPJ\b/.test(upper)) return "documento";
  if (/\bCPF\b/.test(upper)) return "documento_ou_representante_cpf";
  if (/\bRG\b/.test(upper)) return "rg_ou_representante_rg";
  if (/E-?MAIL/.test(upper)) return "email";
  if (/TELEFONE|CELULAR|WHATSAPP/.test(upper)) return "telefone";
  if (upper === "NOME") return "nome";

  return null;
}

/** Analisa os parágrafos extraídos de um .docx (ver extractDocxParagraphs)
 *  e retorna cada ocorrência de "[...]" classificada. Parágrafos sem nenhum
 *  campo "[...]" simplesmente não geram ocorrências — modelo sem campos
 *  resulta em array vazio, sem erro. */
export function analyzeTemplateFields(paragraphs: string[]): TemplateFieldOccurrence[] {
  const events: Event[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    for (const m of paragraph.matchAll(CONTRATANTE_LABEL_RE)) {
      events.push({ type: "label", role: "contratante", pos: m.index ?? 0, paragraphIndex });
    }
    for (const m of paragraph.matchAll(CONTRATADA_LABEL_RE)) {
      events.push({ type: "label", role: "contratada", pos: m.index ?? 0, paragraphIndex });
    }
    if (CLAUSE_BOUNDARY_RE.test(paragraph)) {
      events.push({ type: "boundary", pos: -1, paragraphIndex });
    }
    for (const m of paragraph.matchAll(BRACKET_RE)) {
      events.push({
        type: "field",
        rawText: m[1].trim(),
        pos: m.index ?? 0,
        paragraphIndex,
        paragraphText: paragraph,
      });
    }
  });

  events.sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.pos - b.pos);

  let zone: "contratante" | "contratada" | null = null;
  let contratanteIsPJ = false;
  let contratadaIsPJ = false;
  const occurrences: TemplateFieldOccurrence[] = [];
  let occurrenceIndex = 0;

  for (const event of events) {
    if (event.type === "boundary") {
      zone = null;
      continue;
    }
    if (event.type === "label") {
      zone = event.role;
      continue;
    }

    const role: TemplateFieldRole = zone ?? "especifico";
    let attributeKey: string | null = null;
    let confidence: TemplateFieldConfidence = "high";

    if (role !== "especifico") {
      const guess = guessAttribute(event.rawText);
      const mentionsRepresentante = /REPRESENTANTE/i.test(event.paragraphText);
      const partyIsPJ = role === "contratante" ? contratanteIsPJ : contratadaIsPJ;

      if (guess === "nome" || guess === "documento") {
        attributeKey = guess;
        if (role === "contratante") contratanteIsPJ = true;
        else contratadaIsPJ = true;
      } else if (guess === "documento_ou_representante_cpf") {
        attributeKey = mentionsRepresentante || partyIsPJ ? "representante_cpf" : "documento";
        confidence = "low";
      } else if (guess === "rg_ou_representante_rg") {
        attributeKey = mentionsRepresentante || partyIsPJ ? "representante_rg" : "rg";
        confidence = "low";
      } else if (guess) {
        attributeKey = guess;
      } else {
        attributeKey = null;
        confidence = "low";
      }

      // Campo isolado demais pra ter certeza (ex.: "[NOME]" sozinho, sem
      // indicar de qual parte) — mesmo com um palpite, sinaliza baixa
      // confiança pra revisão manual, como pedido.
      if (/^NOME$/i.test(event.rawText.trim())) confidence = "low";
    }

    occurrences.push({
      occurrenceIndex: occurrenceIndex++,
      rawText: event.rawText,
      paragraphIndex: event.paragraphIndex,
      contextSnippet: event.paragraphText.trim().slice(0, 240),
      role,
      attributeKey,
      confidence,
    });
  }

  return occurrences;
}
