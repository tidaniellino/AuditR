/**
 * Origem absoluta da aplicação, usada para links enviados por e-mail/WhatsApp
 * (redefinição de senha, assinatura de contrato, checkout do Stripe).
 *
 * Não usa headers da requisição (`host`/`x-forwarded-host`) de propósito: eles
 * podem ser forjados pelo cliente, e como esse valor vai direto para links
 * emailados a terceiros, um host forjado permitiria phishing/roubo de token
 * (ex.: link de redefinição de senha apontando para um domínio do atacante).
 * `VERCEL_URL` é preenchido pela própria Vercel (não pelo cliente), então é
 * seguro como fallback para preview deployments.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Restringe um destino de pós-login/pós-OAuth a um caminho relativo interno.
 * `?redirect=`/`redirect_after` chegam de query string ou de um campo oculto
 * de formulário — sem essa checagem, `redirect("https://evil.com")` ou
 * `new URL("//evil.com", origin)` mandariam o usuário, já autenticado, pra
 * fora do site (open redirect), já que tanto o `redirect()` do Next quanto o
 * construtor de `URL` aceitam uma URL absoluta e ignoram a base.
 */
export function safeRedirectPath(path: string, fallback = "/painel"): string {
  if (path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")) {
    return path;
  }
  return fallback;
}
