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

/** Campos "específicos do contrato" que, mesmo sem ligação com o cadastro de
 *  nenhuma parte, têm uma fonte de dado já disponível na geração do
 *  contrato (valor acordado, data de hoje, endereço de Minha Empresa,
 *  registro profissional do sócio) — resolvidos em generateContract. */
export const CONTRACT_ATTRIBUTE_LABELS: Record<string, string> = {
  contrato_valor: "Valor do contrato (com R$)",
  contrato_valor_sem_simbolo: "Valor do contrato (sem R$ — quando o modelo já escreve R$ antes)",
  contrato_dia: "Dia da assinatura (data de hoje)",
  contrato_mes_extenso: "Mês da assinatura por extenso (data de hoje)",
  contrato_ano: "Ano da assinatura (data de hoje)",
  contrato_cidade: "Cidade da assinatura (endereço de Minha Empresa)",
  contrato_estado: "Estado (UF) da assinatura (endereço de Minha Empresa)",
  crc_uf: "UF do registro profissional (CRC/OAB do sócio)",
  crc_numero: "Número do registro profissional (CRC/OAB do sócio)",
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

    // Registro profissional (CRC/OAB) é sempre de Minha Empresa/do sócio,
    // mesmo quando o campo cai dentro do parágrafo de qualificação da parte
    // (como neste modelo, onde o CRC vem logo depois de "CONTRATADA:") —
    // checado antes da classificação por papel, então tem prioridade.
    const isCrcContext = /\bCRC\b/.test(event.paragraphText.toUpperCase());
    const trimmedText = event.rawText.trim();

    if (isCrcContext && /^UF$/i.test(trimmedText)) {
      attributeKey = "crc_uf";
      confidence = "low";
    } else if (isCrcContext && /^[\d.]+$/.test(trimmedText)) {
      attributeKey = "crc_numero";
      confidence = "low";
    } else if (role !== "especifico") {
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
    } else {
      // "Específico do contrato" nem sempre quer dizer "sem fonte de dado
      // nenhuma" — valor já é coletado em outro lugar do sistema (o
      // formulário de geração), só não tem relação com o cadastro do
      // CLIENTE ou de MINHA EMPRESA como parte contratual.
      if (!/POR EXTENSO/.test(trimmedText.toUpperCase()) && /VALOR|PRE[ÇC]O|HONOR[ÁA]RIOS/.test(trimmedText.toUpperCase())) {
        // O modelo já costuma escrever "R$" antes do colchete ("no valor de
        // R$ [VALOR]") — nesse caso o valor é preenchido sem o símbolo, pra
        // não duplicar ("R$ R$ 1.500,00").
        const precedingText = event.paragraphText.slice(0, event.pos);
        attributeKey = /R\$\s*$/i.test(precedingText) ? "contrato_valor_sem_simbolo" : "contrato_valor";
        confidence = "low";
      }
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

  detectClosingDatePattern(occurrences);

  return occurrences;
}

/** Reconhece o fechamento clássico de contrato brasileiro — "[CIDADE],
 *  [ESTADO], [DIA] de [MÊS] de [ANO]." — pela SEQUÊNCIA exata dos três
 *  campos "DIA"/"MÊS"/"ANO" no mesmo parágrafo, e liga à data de hoje.
 *  Importante: "[DIA]" sozinho, sem "[MÊS]" e "[ANO]" logo depois (ex.: "até
 *  o dia [DIA] de cada mês", que é o vencimento do pagamento, não a data do
 *  contrato), continua como campo específico sem valor — não faz sentido
 *  usar o dia de hoje como vencimento de pagamento por coincidência de
 *  nome do campo. CIDADE/ESTADO logo antes do trio (mesmo parágrafo) são
 *  tratados como o local de assinatura; um "[CIDADE/UF]" isolado em outro
 *  lugar do documento (tipicamente o foro, cláusula de jurisdição) não é
 *  tocado — é uma escolha jurídica deliberada, não um dado administrativo. */
function detectClosingDatePattern(occurrences: TemplateFieldOccurrence[]): void {
  for (let i = 0; i < occurrences.length; i++) {
    const dia = occurrences[i];
    if (dia.role !== "especifico" || !/^DIA$/i.test(dia.rawText.trim())) continue;

    const mes = occurrences[i + 1];
    const ano = occurrences[i + 2];
    if (
      !mes ||
      !ano ||
      mes.paragraphIndex !== dia.paragraphIndex ||
      ano.paragraphIndex !== dia.paragraphIndex ||
      mes.role !== "especifico" ||
      ano.role !== "especifico" ||
      !/^M[ÊE]S$/i.test(mes.rawText.trim()) ||
      !/^ANO$/i.test(ano.rawText.trim())
    ) {
      continue;
    }

    dia.attributeKey = "contrato_dia";
    dia.confidence = "high";
    mes.attributeKey = "contrato_mes_extenso";
    mes.confidence = "high";
    ano.attributeKey = "contrato_ano";
    ano.confidence = "high";

    const estado = occurrences[i - 1];
    const cidade = occurrences[i - 2];
    if (
      estado &&
      estado.paragraphIndex === dia.paragraphIndex &&
      estado.role === "especifico" &&
      /^(ESTADO|UF)$/i.test(estado.rawText.trim())
    ) {
      estado.attributeKey = "contrato_estado";
      estado.confidence = "high";
    }
    if (
      cidade &&
      cidade.paragraphIndex === dia.paragraphIndex &&
      cidade.role === "especifico" &&
      /^CIDADE$/i.test(cidade.rawText.trim())
    ) {
      cidade.attributeKey = "contrato_cidade";
      cidade.confidence = "high";
    }
  }
}
