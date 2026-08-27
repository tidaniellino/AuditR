import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAvatarSignedUrl } from "@/lib/storage/avatars";
import { ProfileForm } from "./ProfileForm";
import { AvatarUploadForm } from "./AvatarUploadForm";

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, cpf, avatar_path")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const avatarUrl = await getAvatarSignedUrl(supabase, profile.avatar_path);
  const initial = (profile.full_name || profile.email).charAt(0).toUpperCase();

  return (
    <div className="flex max-w-md flex-col gap-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Conta</p>
        <h1 className="mt-2 font-display text-3xl text-ink_text">Meu perfil</h1>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium text-ink_text">Foto de perfil</h2>
        <AvatarUploadForm avatarUrl={avatarUrl} initial={initial} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-ink_text">Dados pessoais</h2>
        <ProfileForm fullName={profile.full_name} email={profile.email} cpf={profile.cpf} />
      </section>
    </div>
  );
}
