import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const CONTRACT_FILE_BUCKET = "contract-documents";

export async function getContractFileSignedUrl(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<string | null> {
  const { data } = await supabase.storage.from(CONTRACT_FILE_BUCKET).createSignedUrl(path, 60, {
    download: true,
  });
  return data?.signedUrl ?? null;
}
