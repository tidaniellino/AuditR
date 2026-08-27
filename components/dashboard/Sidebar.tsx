"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SidebarNav } from "./SidebarNav";
import { CollapseIcon, ExpandIcon, LogoutIcon } from "./icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { UserRole } from "@/lib/auth/permissions";

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar({
  role,
  fullName,
  email,
  avatarUrl,
  initial,
  logoutAction,
}: {
  role: UserRole | null | undefined;
  fullName: string | undefined;
  email: string | undefined;
  avatarUrl: string | null;
  initial: string;
  logoutAction: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  return (
    <aside
      className={`relative flex shrink-0 flex-col justify-between bg-brand-from px-4 py-6 transition-[width] duration-200 ${
        collapsed ? "w-[4.5rem] px-2" : "w-64"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        className="absolute -right-3 top-8 flex size-6 items-center justify-center rounded-full border border-white/10 bg-brand-from text-ink-400 shadow-md transition-colors hover:text-white"
      >
        {collapsed ? <ExpandIcon className="size-3.5" /> : <CollapseIcon className="size-3.5" />}
      </button>

      <div>
        <div className={`mb-8 flex items-center gap-2.5 ${collapsed ? "justify-center px-0" : "px-2"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imagemmenu.png" alt="AuditR" className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <div>
              <p className="font-display text-base leading-none text-white">AuditR</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">Contratos</p>
            </div>
          )}
        </div>

        <SidebarNav role={role} collapsed={collapsed} />
      </div>

      <div>
        <div className="h-px bg-white/10" />
        <div className={`flex items-center pt-3 ${collapsed ? "justify-center" : "justify-between px-2"}`}>
          {!collapsed && (
            <Link href="/perfil" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-mono text-xs text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{fullName}</p>
                <p className="truncate text-xs text-ink-400">{email}</p>
              </div>
            </Link>
          )}
          <ThemeToggle collapsed={collapsed} />
        </div>

        {collapsed && (
          <Link
            href="/perfil"
            aria-label="Meu perfil"
            title="Meu perfil"
            className="mt-2 flex items-center justify-center transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-mono text-xs text-white">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initial
              )}
            </div>
          </Link>
        )}

        <form action={logoutAction} className={collapsed ? "mt-3 flex justify-center" : "px-2 pt-3"}>
          <button
            type="submit"
            title="Sair"
            className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-white"
          >
            <LogoutIcon className="size-3.5" />
            {!collapsed && "Sair"}
          </button>
        </form>
      </div>
    </aside>
  );
}
