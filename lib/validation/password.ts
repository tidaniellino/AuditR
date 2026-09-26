import { onlyDigits } from "./cpf-cnpj";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_POLICY_HINT = `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`;

// Lista curta de senhas comuns o suficiente pra valer a pena bloquear
// explicitamente — não é uma tentativa de cobrir toda senha vazada (isso é
// papel do "Leaked Password Protection" do Supabase Auth), só barrar os
// casos mais óbvios que alguém digitaria em 2 segundos sem pensar.
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "senha123",
  "senha1234",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "12345678910",
  "87654321",
  "00000000",
  "11111111",
  "22222222",
  "33333333",
  "abcdefgh",
  "aaaaaaaa",
  "brasil123",
  "admin123",
  "teste123",
  "mudar123",
]);

/** Valida a política de senha: só comprimento (8-128) + bloqueio de senhas
 *  muito comuns + não repetir e-mail/CPF do usuário. Sem exigência de
 *  maiúscula/número/caractere especial — comprimento e bloqueio de senhas
 *  fracas protegem mais, na prática, do que forçar complexidade (o usuário
 *  só troca "Senha123" por "Senha123!" pra satisfazer a regra). */
export function validatePassword(password: string, identifiers: { email?: string; cpf?: string } = {}): string[] {
  const problems: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    problems.push(`A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    problems.push("Essa senha é muito comum. Escolha uma senha diferente.");
  }

  const lowerPassword = password.toLowerCase();
  if (identifiers.email && lowerPassword === identifiers.email.toLowerCase()) {
    problems.push("A senha não pode ser igual ao e-mail.");
  }
  if (identifiers.cpf && onlyDigits(password) && onlyDigits(password) === onlyDigits(identifiers.cpf)) {
    problems.push("A senha não pode ser igual ao CPF.");
  }

  return problems;
}
