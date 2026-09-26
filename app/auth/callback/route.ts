import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/url";

// Distingue conta nova / conta existente vinculada agora / login normal
// olhando o created_at da IDENTIDADE do Google em si (não o do usuário) —
// cada identidade (email, google, ...) tem seu próprio created_at, gravado
// no momento em que aquela identidade específica passou a existir. Se a
// identidade do Google é recente E o usuário também é recente -> cadastro
// novo. Se a identidade é recente mas o usuário é antigo -> acabou de
// vincular uma conta que já existia (Regra 4, vinculação automática pelo
// e-mail confirmado). Se nem a identidade é recente -> só um login normal.
function isRecent(iso: string | null | undefined, withinMs = 20_000): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < withinMs;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const redirectAfter = safeRedirectPath(searchParams.get("redirect_after") ?? "/painel");

  if (oauthError) {
    // Usuário cancelou o consentimento do Google, ou o Google recusou.
    return NextResponse.redirect(`${origin}/login?oauth_error=cancelled`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?oauth_error=1`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    // Cenário da Regra 4 mais provável de cair aqui: e-mail já existe em
    // outra conta e o Google não confirma email_verified=true pra essa
    // identidade — o Supabase recusa a vinculação automática e devolve erro
    // em vez de sessão. Mensagem orienta a usar e-mail/senha, como pedido.
    return NextResponse.redirect(`${origin}/login?oauth_error=email_conflict`);
  }

  const googleIdentity = data.user.identities?.find((identity) => identity.provider === "google");
  const identityIsNew = isRecent(googleIdentity?.created_at);
  const userIsNew = isRecent(data.user.created_at);

  let authEvent: "new" | "linked" | "login";
  if (identityIsNew && userIsNew) authEvent = "new";
  else if (identityIsNew && !userIsNew) authEvent = "linked";
  else authEvent = "login";

  const target = new URL(redirectAfter, origin);
  target.searchParams.set("auth_event", authEvent);
  return NextResponse.redirect(target);
}
