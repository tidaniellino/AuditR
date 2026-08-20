import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const TEMPLATE_FILE_BUCKET = "contract-templates";
export const MAX_TEMPLATE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set(["doc", "docx"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isAllowedTemplateFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(extension) && (file.type === "" || ALLOWED_MIME_TYPES.has(file.type));
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

export async function uploadTemplateFile(
  supabase: SupabaseClient<Database>,
  orgId: string,
  templateId: string,
  file: File
): Promise<{ path: string; name: string; size: number } | { error: string }> {
  const path = `${orgId}/${templateId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(TEMPLATE_FILE_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) return { error: "Não foi possível enviar o arquivo-modelo." };

  return { path, name: file.name, size: file.size };
}

export async function deleteTemplateFile(supabase: SupabaseClient<Database>, path: string) {
  await supabase.storage.from(TEMPLATE_FILE_BUCKET).remove([path]);
}

export async function getTemplateFileSignedUrl(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<string | null> {
  const { data } = await supabase.storage.from(TEMPLATE_FILE_BUCKET).createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
