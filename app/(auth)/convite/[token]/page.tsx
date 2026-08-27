import { AuthShell } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/permissions";
import { AcceptInviteForm } from "./AcceptInviteForm";

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_invite_info", { p_token: token });
  const invite = data?.[0];

  if (!invite || !invite.valid) {
    return (
      <AuthShell>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Convite</p>
        <h1 className="mt-2 font-display text-3xl text-ink_text">Convite inválido</h1>
        <p className="mt-4 text-sm text-muted">
          Este link de convite não existe mais, já foi usado ou expirou. Peça a um sócio para enviar um novo.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Convite</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Criar acesso</h1>
      <p className="mb-8 mt-2 text-sm text-muted">
        Você foi convidado(a) como <strong>{ROLE_LABELS[invite.role as UserRole]}</strong>. Defina seu nome e uma
        senha para acessar.
      </p>

      <AcceptInviteForm token={token} orgId={invite.org_id} email={invite.email} />
    </AuthShell>
  );
}
