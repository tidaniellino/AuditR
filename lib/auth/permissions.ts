export type UserRole =
  | "socio"
  | "compliance_legal"
  | "advogado_senior"
  | "advogado_junior"
  | "contador_senior"
  | "contador_junior"
  | "admin";

// RN — Bloqueio de Edição (RBAC): só Sócio ou Compliance Legal podem criar
// ou alterar cláusulas-padrão, modelos e campos do formulário dinâmico.
export const CLAUSE_EDITOR_ROLES: UserRole[] = ["socio", "compliance_legal"];

export function canEditClauses(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return CLAUSE_EDITOR_ROLES.includes(role);
}

export function isComplianceViewer(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return ["socio", "compliance_legal", "admin"].includes(role);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  socio: "Sócio",
  compliance_legal: "Compliance Legal",
  advogado_senior: "Advogado Sênior",
  advogado_junior: "Advogado Júnior",
  contador_senior: "Contador Sênior",
  contador_junior: "Contador Júnior",
  admin: "Administrador",
};
