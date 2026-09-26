"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl, safeRedirectPath } from "@/lib/url";

/** Regra 4: início do fluxo OAuth do Google — usado tanto no cadastro quanto
 *  no login (é o mesmo botão/mecanismo pros dois casos; o Supabase decide,
 *  no callback, se é uma conta nova ou uma já existente). Só monta a URL de
 *  autorização e redireciona; a troca do código por sessão acontece em
 *  app/auth/callback/route.ts. */
export async function signInWithGoogle(formData: FormData) {
  const redirectAfter = safeRedirectPath(String(formData.get("redirect_after") ?? "/painel"));
  const supabase = await createClient();
  const baseUrl = await getBaseUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/auth/callback?redirect_after=${encodeURIComponent(redirectAfter)}`,
    },
  });

  if (error || !data?.url) {
    redirect("/login?oauth_error=1");
  }

  redirect(data.url);
}
