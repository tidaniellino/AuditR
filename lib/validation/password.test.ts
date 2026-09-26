import { describe, expect, it } from "vitest";
import { validatePassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./password";

describe("validatePassword (Regra 3)", () => {
  it("accepts an 8-character password with no complexity requirements", () => {
    expect(validatePassword("xk7qwpzr")).toEqual([]);
  });

  it("rejects passwords shorter than the minimum", () => {
    const problems = validatePassword("a".repeat(PASSWORD_MIN_LENGTH - 1));
    expect(problems).toContain(`A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
  });

  it("rejects passwords longer than the maximum", () => {
    const problems = validatePassword("a".repeat(PASSWORD_MAX_LENGTH + 1));
    expect(problems).toContain(`A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);
  });

  it("does NOT require uppercase, digits or special characters", () => {
    expect(validatePassword("somenteletrasminuscul")).toEqual([]);
  });

  it("blocks common passwords regardless of case", () => {
    expect(validatePassword("senha123")).not.toEqual([]);
    expect(validatePassword("SENHA123")).not.toEqual([]);
  });

  it("rejects a password equal to the user's e-mail", () => {
    const problems = validatePassword("user@example.com", { email: "user@example.com" });
    expect(problems).toContain("A senha não pode ser igual ao e-mail.");
  });

  it("rejects a password equal to the user's CPF", () => {
    const problems = validatePassword("52998224725", { cpf: "529.982.247-25" });
    expect(problems).toContain("A senha não pode ser igual ao CPF.");
  });

  it("accepts a normal, non-common, sufficiently long password", () => {
    expect(validatePassword("corretocavalobateria")).toEqual([]);
  });
});
