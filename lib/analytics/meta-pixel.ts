declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Dispara um evento do Meta Pixel — no-op se o script ainda não carregou
 *  (ex.: bloqueador de anúncios) ou em SSR, onde não há `window`. */
export function trackMetaPixelEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", eventName, params);
}
