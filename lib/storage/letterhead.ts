import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const LETTERHEAD_BUCKET = "org-letterheads";
export const MAX_LETTERHEAD_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedLetterheadFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return extension === "docx";
}

function sanitizeFileName(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const base = name
    .slice(0, name.length - extension.length - 1)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "arquivo"}.${extension}`;
}

export async function uploadLetterheadFile(
  supabase: SupabaseClient<Database>,
  orgId: string,
  file: File
): Promise<{ path: string; name: string; size: number } | { error: string }> {
  const path = `${orgId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(LETTERHEAD_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) return { error: "Não foi possível enviar o arquivo de papel timbrado." };

  return { path, name: file.name, size: file.size };
}

export async function deleteLetterheadFile(supabase: SupabaseClient<Database>, path: string) {
  await supabase.storage.from(LETTERHEAD_BUCKET).remove([path]);
}

export async function getLetterheadFileSignedUrl(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<string | null> {
  const { data } = await supabase.storage.from(LETTERHEAD_BUCKET).createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

export async function downloadLetterheadFile(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(LETTERHEAD_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
