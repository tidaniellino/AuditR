import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino do link de recuperação de senha (gerado via admin.generateLink,
// enviado pelo Resend — ver esqueci-senha/actions.ts). Verifica o token_hash
// diretamente no servidor com verifyOtp(), que estabelece a sessão via
// cookie sem nunca colocar access_token/refresh_token na URL do navegador.
// Depois manda o usuário trocar a senha em /trocar-senha, que já sabe zerar
// o bloqueio de login de qualquer redefinição bem-sucedida.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");

  if (tokenHash) {
    const supabase = await createClient();
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  }

  return NextResponse.redirect(new URL("/trocar-senha", request.url));
}
