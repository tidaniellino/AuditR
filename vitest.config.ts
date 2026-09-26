import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // supabase/functions/** são Edge Functions (runtime Deno, imports por URL
    // https:) — não rodam sob o loader ESM do Node/Vitest. Têm seus próprios
    // testes, executados via `supabase functions ... --deno`, não aqui.
    exclude: ["node_modules/**", "supabase/functions/**"],
  },
});
