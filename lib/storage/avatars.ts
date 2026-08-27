import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedAvatarFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(extension) && (file.type === "" || ALLOWED_MIME_TYPES.has(file.type));
}

export async function uploadAvatarFile(
  supabase: SupabaseClient<Database>,
  orgId: string,
  userId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${orgId}/${userId}/${Date.now()}-avatar.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) return { error: "Não foi possível enviar a foto." };

  return { path };
}

export async function deleteAvatarFile(supabase: SupabaseClient<Database>, path: string) {
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}

export async function getAvatarSignedUrl(
  supabase: SupabaseClient<Database>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
