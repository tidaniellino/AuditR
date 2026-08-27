const FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Chama a Edge Function pública "assinatura" (roda com service_role, fora do RLS). */
export async function callSigningFunction<T = unknown>(body: {
  action: "info" | "verify";
  contract_id: string;
  code?: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(`${FUNCTIONS_URL}/assinatura`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: json?.error ?? "unknown_error" };
  }
  return { ok: true, data: json as T };
}
