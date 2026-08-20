import { createHash, randomInt } from "crypto";

/** Código numérico de 6 dígitos enviado por e-mail para assinatura do contrato. */
export function generateSigningCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashSigningCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function hashBuffer(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export const SIGNING_CODE_TTL_HOURS = 24;
