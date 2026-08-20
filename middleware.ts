import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canEditClauses, type UserRole } from "@/lib/auth/permissions";

// Bloqueiam acesso autenticado (redireciona pra "/" se já houver sessão).
const AUTH_PUBLIC_PATHS = ["/login", "/onboarding"];
// Sempre públicas — o assinante do contrato nunca tem conta no sistema.
const ALWAYS_PUBLIC_PATHS = ["/assinar"];

// Rotas de escrita que exigem perfil Sócio ou Compliance Legal (RN — RBAC).
// A listagem de /modelos fica aberta a todos — só criar/editar é restrito.
const CLAUSE_EDITOR_PATTERNS = [
  /^\/clausulas\/novo/,
  /^\/clausulas\/[^/]+\/editar/,
  /^\/modelos\/novo/,
  /^\/modelos\/[^/]+\/editar/,
];

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthPublic = AUTH_PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAlwaysPublic = ALWAYS_PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isAuthPublic && !isAlwaysPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const requiresClauseEditor = CLAUSE_EDITOR_PATTERNS.some((re) => re.test(pathname));
  if (user && requiresClauseEditor) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!canEditClauses(profile?.role as UserRole | undefined)) {
      const url = request.nextUrl.clone();
      url.pathname = "/acesso-negado";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Roda em todas as rotas, exceto assets estáticos.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
