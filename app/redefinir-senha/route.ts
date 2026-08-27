import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino do link de recuperação de senha (gerado via admin.generateLink) —
// troca o código pela sessão e manda o usuário trocar a senha em /trocar-senha,
// que já sabe zerar o bloqueio de login de qualquer redefinição bem-sucedida.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/trocar-senha", request.url));
}
