import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Client com a Service Role Key — só para uso em Server Actions/Route Handlers,
// nunca importado em Client Component. Necessário para operações de admin
// (criar usuário com senha definida, gerar link de recuperação de senha) que a
// API pública do Supabase não permite com a anon key.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — necessária para cadastrar usuários e redefinir senhas. Veja Project Settings → API no Dashboard do Supabase."
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
