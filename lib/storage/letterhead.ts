import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const LETTERHEAD_BUCKET = "org-letterheads";
// Ver comentário equivalente em lib/storage/templates.ts — um cabeçalho/
// rodapé timbrado é sempre pequeno; limite baixo também reduz o tamanho
// máximo de um "zip bomb" (.docx é um .zip descompactado sem limite pela
// PizZip).
export const MAX_LETTERHEAD_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

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

  // Content-Type fixo (não o que o navegador reportou) — o chamador já
  // validou os magic bytes antes de chegar aqui, então sabemos que é
  // mesmo um .docx real, independente do que file.type diga.
  const { error } = await supabase.storage.from(LETTERHEAD_BUCKET).upload(path, file, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
