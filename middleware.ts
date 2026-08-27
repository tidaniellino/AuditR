import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canEditClauses, canManageOrg, type UserRole } from "@/lib/auth/permissions";

// Bloqueiam acesso autenticado (redireciona pra "/" se já houver sessão).
const AUTH_PUBLIC_PATHS = ["/login", "/onboarding"];
// Sempre públicas — o assinante do contrato e o convidado ainda sem conta
// nunca têm sessão no sistema.
const ALWAYS_PUBLIC_PATHS = ["/assinar", "/convite"];

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

  if (!user && !isAuthPublic && !isAlwaysPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return noStore(NextResponse.redirect(url));
  }

  if (user && isAuthPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return noStore(NextResponse.redirect(url));
  }

  const requiresClauseEditor = CLAUSE_EDITOR_PATTERNS.some((re) => re.test(pathname));
  const requiresOrgManager = ORG_MANAGER_PATTERNS.some((re) => re.test(pathname));
  if (user && (requiresClauseEditor || requiresOrgManager)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;
    const allowed = requiresOrgManager ? canManageOrg(role) : canEditClauses(role);

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/acesso-negado";
      return noStore(NextResponse.redirect(url));
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
