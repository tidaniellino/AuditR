import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageOrg, ROLE_LABELS, type UserRole } from "@/lib/auth/permissions";
import { SearchParamsToast } from "@/components/ui/SearchParamsToast";
import { OrgSettingsForm } from "./OrgSettingsForm";
import { CreateMemberModal } from "./CreateMemberModal";
import { MemberRoleSelect } from "./MemberRoleSelect";
import { MemberActiveToggle } from "./MemberActiveToggle";
import { UnlockMemberButton } from "./UnlockMemberButton";
import { DefaultSignerToggle } from "./DefaultSignerToggle";

export default async function EmpresaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!canManageOrg(profile?.role as UserRole | undefined)) redirect("/acesso-negado");

  const [{ data: org }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", profile!.org_id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, active, login_blocked, is_default_signer")
      .eq("org_id", profile!.org_id)
      .order("created_at", { ascending: true }),
  ]);

  if (!org) redirect("/acesso-negado");

  return (
    <div className="flex flex-col gap-10 pb-10">
      <SearchParamsToast />

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Configurações</p>
        <h1 className="mt-2 font-display text-3xl text-ink_text">Minha empresa</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Dados que aparecem nos contratos gerados e usuários com acesso ao sistema.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium text-ink_text">Dados da empresa</h2>
        <OrgSettingsForm
          org={{
            name: org.name,
            cnpj: org.cnpj,
            email: org.email,
            telefone: org.telefone,
            endereco: org.endereco as Record<string, string | null> | null,
          }}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-ink_text">Equipe</h2>
            <p className="mt-1 text-xs text-muted">
              Usuários com acesso ao sistema. Quem tem perfil Sócio assina automaticamente os contratos
              gerados (nome, CPF e assinatura eletrônica no PDF). Marque um Sócio como signatário padrão
              para ele ser o usado quando o contrato só precisa de uma assinatura.
            </p>
          </div>
          <CreateMemberModal />
        </div>

        <div className="overflow-hidden rounded-card border border-edge bg-card shadow-sm shadow-ink-900/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge bg-mist text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assinatura</th>
                <th className="px-4 py-3 font-medium">Acesso</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => {
                const isSelf = m.id === user.id;
                return (
                  <tr key={m.id} className="border-b border-edge last:border-0 hover:bg-mist/60">
                    <td className="px-4 py-3 font-medium text-ink_text">
                      {m.full_name}
                      {isSelf && <span className="ml-1.5 text-xs text-muted">(você)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{m.email}</td>
                    <td className="px-4 py-3">
                      <MemberRoleSelect memberId={m.id} role={m.role as UserRole} disabled={isSelf} />
                    </td>
                    <td className="px-4 py-3">
                      <MemberActiveToggle memberId={m.id} active={m.active} disabled={isSelf} />
                    </td>
                    <td className="px-4 py-3">
                      {m.role === "socio" ? (
                        <DefaultSignerToggle memberId={m.id} isDefault={m.is_default_signer} />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.login_blocked ? (
                        <UnlockMemberButton memberId={m.id} memberName={m.full_name} />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Perfis disponíveis: {Object.values(ROLE_LABELS).join(", ")}.
        </p>
      </section>
    </div>
  );
}
