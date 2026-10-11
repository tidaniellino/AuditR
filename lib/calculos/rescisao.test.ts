import { describe, expect, it } from "vitest";
import { calcularRescisao } from "./rescisao";
import { calcularINSS, calcularIRRF, calcularRedutorLei15270 } from "./tabelas-2026";

function verba(result: ReturnType<typeof calcularRescisao>, label: string) {
  return result.verbas.find((v) => v.label === label);
}

describe("tabelas-2026 — INSS", () => {
  it("aplica a primeira faixa sem parcela a deduzir", () => {
    expect(calcularINSS(1000)).toBeCloseTo(75, 2); // 1000 * 7.5%
  });

  it("aplica a faixa de 9% com parcela a deduzir", () => {
    expect(calcularINSS(2250)).toBeCloseTo(178.18, 2); // 2250*9% - 24.32
  });

  it("respeita o teto de contribuição", () => {
    expect(calcularINSS(50_000)).toBeCloseTo(988.09, 2);
  });
});

describe("tabelas-2026 — IRRF e redutor da Lei 15.270/2025", () => {
  it("zera o IRRF com o redutor para quem ganha até R$5.000", () => {
    expect(calcularIRRF(3000, 0)).toBe(0);
  });

  it("redutor decresce linearmente entre R$5.000 e R$7.350", () => {
    expect(calcularRedutorLei15270(5_000)).toBeCloseTo(312.89, 2);
    expect(calcularRedutorLei15270(6_000)).toBeCloseTo(179.75, 1);
    expect(calcularRedutorLei15270(7_350)).toBeCloseTo(0, 2);
    expect(calcularRedutorLei15270(8_000)).toBe(0);
  });

  it("cobra IRRF integral bem acima do teto do redutor", () => {
    // Sem dependentes, salário alto o bastante pro redutor não zerar o imposto.
    expect(calcularIRRF(15_000, 0)).toBeGreaterThan(0);
  });
});

describe("calcularRescisao — dispensa sem justa causa", () => {
  it("calcula saldo de salário, férias vencidas, 13º e multa de 40%", () => {
    const r = calcularRescisao({
      tipo: "sem_justa_causa",
      dataAdmissao: "2023-10-01",
      dataDemissao: "2025-10-01",
      salarioBruto: 3000,
      avisoPrevio: "dispensado",
      periodosFeriasVencidas: 1,
      numeroDependentes: 0,
    });

    expect(verba(r, "Saldo de salário")?.valor).toBeCloseTo(100, 2);
    expect(verba(r, "Férias vencidas + 1/3")?.valor).toBeCloseTo(4000, 2);
    expect(verba(r, "13º salário proporcional (9/12)")?.valor).toBeCloseTo(2250, 2);
    expect(verba(r, "Multa de 40% do FGTS")?.valor).toBeCloseTo(2304, 2);

    expect(r.totalVerbas).toBeCloseTo(8654, 2);
    expect(r.inss).toBeCloseTo(185.68, 2);
    expect(r.irrf).toBeCloseTo(0, 2);
    expect(r.totalLiquido).toBeCloseTo(8468.32, 2);
    expect(r.diasAvisoPrevio).toBe(36);
    expect(r.fgtsMultaPercentual).toBe(0.4);
  });

  it("projeta o aviso prévio indenizado para férias e 13º (Súmula 371 TST)", () => {
    const r = calcularRescisao({
      tipo: "sem_justa_causa",
      dataAdmissao: "2024-01-01",
      dataDemissao: "2026-01-01",
      salarioBruto: 3000,
      avisoPrevio: "indenizado",
      periodosFeriasVencidas: 0,
      numeroDependentes: 0,
    });

    expect(r.diasAvisoPrevio).toBe(36);
    expect(verba(r, "Aviso prévio indenizado")?.valor).toBeCloseTo(3600, 2);
    expect(verba(r, "Férias proporcionais (1/12) + 1/3")?.valor).toBeCloseTo(333.33, 2);
    expect(verba(r, "13º salário proporcional (1/12)")?.valor).toBeCloseTo(250, 2);
    expect(r.totalLiquido).toBeCloseTo(6561.08, 2);
  });
});

describe("calcularRescisao — dispensa por justa causa", () => {
  it("perde aviso, férias proporcionais e 13º, mas mantém férias vencidas", () => {
    const r = calcularRescisao({
      tipo: "justa_causa",
      dataAdmissao: "2022-05-01",
      dataDemissao: "2026-05-01",
      salarioBruto: 3000,
      avisoPrevio: "dispensado",
      periodosFeriasVencidas: 1,
      numeroDependentes: 0,
    });

    expect(r.diasAvisoPrevio).toBe(0);
    expect(verba(r, "Aviso prévio indenizado")).toBeUndefined();
    expect(verba(r, "Férias vencidas + 1/3")?.valor).toBeCloseTo(4000, 2);
    expect(r.verbas.some((v) => v.label.startsWith("Férias proporcionais"))).toBe(false);
    expect(r.verbas.some((v) => v.label.startsWith("13º salário"))).toBe(false);
    expect(r.fgtsMultaPercentual).toBe(0);
    expect(r.verbas.some((v) => v.label.includes("Multa"))).toBe(false);
    expect(r.totalLiquido).toBeCloseTo(4092.5, 2);
    expect(r.avisos.some((a) => a.includes("sem férias proporcionais"))).toBe(true);
    expect(r.avisos.some((a) => a.includes("sem 13º proporcional"))).toBe(true);
  });
});

describe("calcularRescisao — acordo Art. 484-A CLT", () => {
  it("paga meio aviso prévio e multa de 20% do FGTS", () => {
    const r = calcularRescisao({
      tipo: "acordo_484a",
      dataAdmissao: "2024-06-01",
      dataDemissao: "2026-06-01",
      salarioBruto: 3000,
      avisoPrevio: "indenizado",
      periodosFeriasVencidas: 0,
      numeroDependentes: 0,
    });

    expect(verba(r, "Aviso prévio indenizado")?.valor).toBeCloseTo(1800, 2);
    expect(verba(r, "13º salário proporcional (6/12)")?.valor).toBeCloseTo(1500, 2);
    expect(verba(r, "Multa de 20% do FGTS")?.valor).toBeCloseTo(1152, 2);
    expect(r.fgtsMultaPercentual).toBe(0.2);
    expect(r.totalLiquido).toBeCloseTo(4765.33, 2);
  });
});

describe("calcularRescisao — pedido de demissão", () => {
  it("não paga aviso prévio indenizado nem multa de FGTS", () => {
    const r = calcularRescisao({
      tipo: "pedido_demissao",
      dataAdmissao: "2023-03-01",
      dataDemissao: "2025-07-20",
      salarioBruto: 2500,
      avisoPrevio: "indenizado",
      periodosFeriasVencidas: 0,
      numeroDependentes: 0,
    });

    expect(r.fgtsMultaPercentual).toBe(0);
    expect(r.verbas.some((v) => v.label.includes("Multa"))).toBe(false);
    // Empregado não recebe aviso indenizado quando é ele que pede demissão,
    // mesmo marcando "indenizado" no formulário.
    expect(verba(r, "Aviso prévio indenizado")).toBeUndefined();
    expect(r.avisos.some((a) => a.includes("não recebe aviso prévio indenizado"))).toBe(true);
    // Mantém férias e 13º proporcionais (só perde em justa causa).
    expect(r.verbas.some((v) => v.label.startsWith("Férias proporcionais"))).toBe(true);
    expect(r.verbas.some((v) => v.label.startsWith("13º salário"))).toBe(true);
  });
});
