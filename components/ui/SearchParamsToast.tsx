"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./Toast";

/** Mostra como toast os parâmetros ?erro=/?sucesso= de um redirect e limpa a URL. */
export function SearchParamsToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { push } = useToast();

  useEffect(() => {
    const erro = searchParams.get("erro");
    const sucesso = searchParams.get("sucesso");
    if (!erro && !sucesso) return;

    if (erro) push("error", erro);
    if (sucesso) push("success", sucesso);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("erro");
    params.delete("sucesso");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
