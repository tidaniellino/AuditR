import { describe, expect, it } from "vitest";
import {
  isValidCPF,
  isValidCNPJ,
  isValidCpfOuCnpj,
  formatCPF,
  formatCNPJ,
  formatCpfOuCnpj,
  onlyDigits,
} from "./cpf-cnpj";

describe("isValidCPF", () => {
  it("accepts a valid CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("rejects wrong check digits", () => {
    expect(isValidCPF("529.982.247-26")).toBe(false);
  });

  it("rejects all-same-digit sequences", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidCPF("123456")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("accepts a valid CNPJ", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("rejects wrong check digits", () => {
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
  });

  it("rejects all-same-digit sequences", () => {
    expect(isValidCNPJ("11.111.111/1111-11")).toBe(false);
  });
});

describe("isValidCpfOuCnpj (Regra 2 — campo único)", () => {
  it("infers CPF from 11 digits", () => {
    expect(isValidCpfOuCnpj("529.982.247-25")).toBe(true);
  });

  it("infers CNPJ from 14 digits", () => {
    expect(isValidCpfOuCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejects any other digit count", () => {
    expect(isValidCpfOuCnpj("123456")).toBe(false);
    expect(isValidCpfOuCnpj("")).toBe(false);
  });
});

describe("formatting", () => {
  it("formats CPF with mask", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  it("formats CNPJ with mask", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formatCpfOuCnpj picks the mask by digit count", () => {
    expect(formatCpfOuCnpj("52998224725")).toBe("529.982.247-25");
    expect(formatCpfOuCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("onlyDigits", () => {
  it("strips everything but digits", () => {
    expect(onlyDigits("11.222.333/0001-81")).toBe("11222333000181");
  });
});
