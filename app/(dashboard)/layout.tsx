import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { logout } from "../(auth)/login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const initial = (profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-brand-from px-4 py-6">
        <div>
          <div className="mb-8 flex items-center gap-2.5 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/imagemmenu.png" alt="AuditR" className="h-9 w-9" />
            <div>
              <p className="font-display text-base leading-none text-white">AuditR</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
                Contratos
              </p>
            </div>
          </div>

          <SidebarNav />
        </div>

        <div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center gap-2.5 px-2 pt-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{profile?.full_name}</p>
              <p className="truncate text-xs text-ink-400">{profile?.email ?? user.email}</p>
            </div>
          </div>
          <form action={logout} className="px-2 pt-3">
            <button type="submit" className="text-xs text-ink-400 hover:text-white">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-mist px-10 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
