import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAvatarSignedUrl } from "@/lib/storage/avatars";
import { Sidebar } from "@/components/dashboard/Sidebar";
import type { UserRole } from "@/lib/auth/permissions";
import { logout } from "../(auth)/login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, avatar_path")
    .eq("id", user.id)
    .single();

  const avatarUrl = await getAvatarSignedUrl(supabase, profile?.avatar_path ?? null);
  const initial = (profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={profile?.role as UserRole | undefined}
        fullName={profile?.full_name}
        email={profile?.email ?? user.email}
        avatarUrl={avatarUrl}
        initial={initial}
        logoutAction={logout}
      />

      <main className="min-w-0 flex-1 bg-mist px-4 pb-6 pt-20 sm:px-6 sm:pt-10 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
