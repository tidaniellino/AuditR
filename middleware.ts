import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canEditClauses, canManageOrg, type UserRole } from "@/lib/auth/permissions";

// Home do app pra quem já está logado — "/" virou a landing pública.
const APP_HOME_PATH = "/painel";
// Bloqueiam acesso autenticado (redireciona pro painel se já houver sessão).
const AUTH_PUBLIC_PATHS = ["/login", "/onboarding", "/esqueci-senha"];
// Sempre públicas — o assinante do contrato, os links de confirmação de
// cadastro e redefinição de senha (que ainda estão trocando o token_hash
// pela sessão) e o webhook da Stripe (sem cookie/sessão, autenticado pela
// assinatura HMAC do próprio payload) nunca têm sessão prévia.
const ALWAYS_PUBLIC_PATHS = ["/assinar", "/confirmar-conta", "/redefinir-senha", "/api/stripe/webhook"];
// Único destino permitido enquanto a troca de senha obrigatória está pendente.
const PASSWORD_CHANGE_PATH = "/trocar-senha";

// Rotas de escrita de cláusulas/modelos — hoje liberado a qualquer perfil
// autenticado (Sócio ou Funcionário); mantido como ponto único de checagem
// caso volte a existir uma role sem essa permissão.
// A listagem de /modelos fica aberta a todos — só criar/editar é restrito.
const CLAUSE_EDITOR_PATTERNS = [
  /^\/clausulas\/novo/,
  /^\/clausulas\/[^/]+\/editar/,
  /^\/modelos\/novo/,
  /^\/modelos\/[^/]+\/editar/,
];

// Dados da empresa, sócios e cadastro de usuários — só Sócio/Admin.
const ORG_MANAGER_PATTERNS = [/^\/empresa/];

// Impede que o navegador restaure uma página autenticada a partir do cache
// (bfcache/voltar) depois de logout — cada acesso exige revalidação real.
function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
}

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthPublic = AUTH_PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAlwaysPublic = ALWAYS_PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  // "/" (landing com os planos) é a única rota pública comparada por igualdade
  // exata — comparar com startsWith() bateria em toda e qualquer rota.
  const isRoot = pathname === "/";

  if (!user && !isAuthPublic && !isAlwaysPublic && !isRoot) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return noStore(NextResponse.redirect(url));
  }

  if (user && (isAuthPublic || isRoot)) {
    const url = request.nextUrl.clone();
    url.pathname = APP_HOME_PATH;
    return noStore(NextResponse.redirect(url));
  }

  if (user && !isAlwaysPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", user.id)
      .single();

    if (profile?.must_change_password && pathname !== PASSWORD_CHANGE_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = PASSWORD_CHANGE_PATH;
      return noStore(NextResponse.redirect(url));
    }

    const role = profile?.role as UserRole | undefined;
    const requiresClauseEditor = CLAUSE_EDITOR_PATTERNS.some((re) => re.test(pathname));
    const requiresOrgManager = ORG_MANAGER_PATTERNS.some((re) => re.test(pathname));
    if (requiresClauseEditor || requiresOrgManager) {
      const allowed = requiresOrgManager ? canManageOrg(role) : canEditClauses(role);
      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/acesso-negado";
        return noStore(NextResponse.redirect(url));
      }
    }
  }

  return noStore(response);
}

export const config = {
  matcher: [
    // Roda em todas as rotas, exceto assets estáticos.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
