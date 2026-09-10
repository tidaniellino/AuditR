import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/url";
import { resumePendingCheckoutUrl } from "@/lib/stripe/resume-checkout";

// Destino do link de confirmação de cadastro (gerado via admin.generateLink,
// enviado pelo Resend — ver onboarding/actions.ts). Verifica o token_hash
// diretamente no servidor com verifyOtp(), que estabelece a sessão via
// cookie sem nunca colocar access_token/refresh_token na URL do navegador —
// ao contrário do link cru do Supabase (action_link), que redireciona com os
// tokens na fragment (#access_token=...) por padrão.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/login?erro=${encodeURIComponent("Link de confirmação inválido ou expirado.")}`, request.url)
    );
  }

  const baseUrl = await getBaseUrl();
  const checkoutUrl = await resumePendingCheckoutUrl({
    supabase,
    userId: data.user.id,
    email: data.user.email,
    baseUrl,
  });

  return NextResponse.redirect(checkoutUrl ?? new URL("/painel", request.url));
}
