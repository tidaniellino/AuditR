"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/events";
import { trackMetaPixelEvent } from "@/lib/analytics/meta-pixel";

/** Lê ?auth_event= deixado pelo callback do Google (Regra 4/7), dispara o
 *  evento de analytics certo uma única vez e limpa a URL. Fica em /painel
 *  porque o callback (Route Handler, sem contexto de navegador) não pode
 *  chamar fbq/trackEvent diretamente. */
export function AuthEventTracker() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const authEvent = searchParams.get("auth_event");
    if (!authEvent) return;

    if (authEvent === "new") {
      trackEvent("signup_completed", { method: "google" });
      trackMetaPixelEvent("CompleteRegistration", { value: 0, currency: "BRL" });
    } else if (authEvent === "linked") {
      trackEvent("account_linked_google");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth_event");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
