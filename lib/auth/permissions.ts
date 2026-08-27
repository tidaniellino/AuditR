export type UserRole = "socio" | "funcionario";

// Funcionário pode fazer tudo, exceto o que é restrito a Sócio (dados da
// empresa, sócios, equipe) — então não há mais distinção de role aqui,
// qualquer perfil autenticado pode criar/editar cláusulas, modelos e campos
// do formulário dinâmico (espelha public.can_edit_clauses() no banco).
export function canEditClauses(role: UserRole | null | undefined): boolean {
  return !!role;
}

export function isComplianceViewer(role: UserRole | null | undefined): boolean {
  return role === "socio";
}

// RN — Dados da empresa, sócios e cadastro de novos usuários são restritos
// ao Sócio.
export function canManageOrg(role: UserRole | null | undefined): boolean {
  return role === "socio";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  socio: "Sócio",
  funcionario: "Funcionário",
};

export const SOCIO_SIGNATURE_WARNING =
  "O perfil Sócio assina automaticamente os contratos gerados (nome, CPF e assinatura eletrônica aparecem no PDF). Confirma associar o perfil Sócio a este usuário?";
