"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/events";

/** Regra 7: dispara first_contract_generated quando a página do contrato é
 *  aberta logo após a criação do primeiro contrato da organização (sinal
 *  passado via ?first_contract=1 pelo redirect de createContract). */
export function FirstContractTracker() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("first_contract") !== "1") return;

    trackEvent("first_contract_generated");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("first_contract");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
