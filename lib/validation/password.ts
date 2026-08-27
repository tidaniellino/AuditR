import { onlyDigits } from "./cpf-cnpj";

export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_POLICY_HINT =
  `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres, com letra maiúscula, minúscula, número e caractere especial.`;

/** Valida a política de senha (mínimo de caracteres + complexidade) e que não repete e-mail/CPF do usuário. */
export function validatePassword(password: string, identifiers: { email?: string; cpf?: string } = {}): string[] {
  const problems: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (!/[a-z]/.test(password)) problems.push("A senha deve ter ao menos uma letra minúscula.");
  if (!/[A-Z]/.test(password)) problems.push("A senha deve ter ao menos uma letra maiúscula.");
  if (!/[0-9]/.test(password)) problems.push("A senha deve ter ao menos um número.");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("A senha deve ter ao menos um caractere especial.");

  const lowerPassword = password.toLowerCase();
  if (identifiers.email && lowerPassword === identifiers.email.toLowerCase()) {
    problems.push("A senha não pode ser igual ao e-mail.");
  }
  if (identifiers.cpf && onlyDigits(password) && onlyDigits(password) === onlyDigits(identifiers.cpf)) {
    problems.push("A senha não pode ser igual ao CPF.");
  }

  return problems;
}
