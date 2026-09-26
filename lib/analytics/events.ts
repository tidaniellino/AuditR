import { trackMetaPixelEvent } from "./meta-pixel";

/** Eventos de produto do funil de cadastro/ativação (Regra 7). Hoje só
 *  encaminha pro Meta Pixel (via trackCustom — nomes como "signup_started"
 *  não são eventos padrão do Meta), mas fica num único ponto de disparo
 *  pra trocar/adicionar outro provedor de analytics sem mexer nos call
 *  sites. Em dev, também loga no console pra facilitar depuração manual. */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, properties ?? {});
  }
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("trackCustom", name, properties);
}
