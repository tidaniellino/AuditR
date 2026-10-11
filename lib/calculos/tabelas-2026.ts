/**
 * Tabelas de INSS e IRRF — vigentes a partir de janeiro/2026.
 *
 * Fontes: tabela progressiva do INSS (Portaria Interministerial MPS/MF) e
 * tabela do IRRF + redutor da Lei 15.270/2025 (Receita Federal, comunicado
 * de adequação sistêmica de dez/2025). Ambas mudam todo ano — quando a
 * Receita/INSS publicar valores novos, atualize só este arquivo.
 */

export interface Faixa {
  /** Limite superior da faixa (R$). `Infinity` pra última faixa. */
  ate: number;
  aliquota: number;
  parcelaADeduzir: number;
}

/** Teto do salário de contribuição — acima disso, o INSS não cresce mais. */
export const INSS_TETO_CONTRIBUICAO = 8_475.55;
export const INSS_CONTRIBUICAO_MAXIMA = 988.09;

export const TABELA_INSS_2026: Faixa[] = [
  { ate: 1_621.0, aliquota: 0.075, parcelaADeduzir: 0 },
  { ate: 2_902.84, aliquota: 0.09, parcelaADeduzir: 24.32 },
  { ate: 4_354.27, aliquota: 0.12, parcelaADeduzir: 111.4 },
  { ate: Infinity, aliquota: 0.14, parcelaADeduzir: 198.49 },
];

export const TABELA_IRRF_2026: Faixa[] = [
  { ate: 2_428.8, aliquota: 0, parcelaADeduzir: 0 },
  { ate: 2_826.65, aliquota: 0.075, parcelaADeduzir: 182.16 },
  { ate: 3_751.05, aliquota: 0.15, parcelaADeduzir: 394.16 },
  { ate: 4_664.68, aliquota: 0.225, parcelaADeduzir: 675.49 },
  { ate: Infinity, aliquota: 0.275, parcelaADeduzir: 908.73 },
];

export const IRRF_DEDUCAO_POR_DEPENDENTE = 189.59;
export const IRRF_DESCONTO_SIMPLIFICADO = 607.2;

/**
 * Redutor da Lei 15.270/2025 — zera (até R$312,89) ou reduz o IRRF já
 * apurado pela tabela progressiva, pra quem ganha até R$7.350/mês.
 * Nunca gera valor negativo (não é restituição, só abate o imposto devido).
 */
export function calcularRedutorLei15270(rendimentoTributavelMensal: number): number {
  if (rendimentoTributavelMensal <= 5_000) return 312.89;
  if (rendimentoTributavelMensal >= 7_350) return 0;
  const redutor = 978.62 - 0.133145 * rendimentoTributavelMensal;
  return Math.max(0, redutor);
}

function calcularPorFaixas(base: number, tabela: Faixa[]): number {
  if (base <= 0) return 0;
  const faixa = tabela.find((f) => base <= f.ate) ?? tabela[tabela.length - 1];
  const valor = base * faixa.aliquota - faixa.parcelaADeduzir;
  return Math.max(0, valor);
}

/** INSS sobre uma base salarial (respeita o teto de contribuição). */
export function calcularINSS(baseSalarial: number): number {
  const base = Math.min(baseSalarial, INSS_TETO_CONTRIBUICAO);
  return Math.round(calcularPorFaixas(base, TABELA_INSS_2026) * 100) / 100;
}

/**
 * IRRF sobre uma base tributável, já líquida de INSS e com o desconto por
 * dependentes (ou o desconto simplificado, o que for melhor pro contribuinte)
 * aplicado, mais o redutor da Lei 15.270/2025.
 */
export function calcularIRRF(rendimentoTributavel: number, numeroDependentes: number): number {
  if (rendimentoTributavel <= 0) return 0;

  const inss = calcularINSS(rendimentoTributavel);
  const deducaoDependentes = numeroDependentes * IRRF_DEDUCAO_POR_DEPENDENTE;

  const baseComDeducoesLegais = rendimentoTributavel - inss - deducaoDependentes;
  const baseComDescontoSimplificado = rendimentoTributavel - IRRF_DESCONTO_SIMPLIFICADO;
  // A lei garante o desconto que resultar em menos imposto — usamos a base maior.
  const base = Math.max(baseComDeducoesLegais, baseComDescontoSimplificado);

  const irrfApurado = calcularPorFaixas(base, TABELA_IRRF_2026);
  const redutor = calcularRedutorLei15270(rendimentoTributavel);
  const irrfFinal = Math.max(0, irrfApurado - Math.min(redutor, irrfApurado));

  return Math.round(irrfFinal * 100) / 100;
}
