"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./SidebarNav";
import { CollapseIcon, ExpandIcon, LogoutIcon, MenuIcon, CloseIcon } from "./icons";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  const effectiveCollapsed = collapsed && !mobileOpen;

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        title="Abrir menu"
        className="fixed left-4 top-4 z-30 flex size-9 items-center justify-center rounded-card bg-brand-from text-white shadow-md md:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col justify-between bg-brand-from px-4 py-6 transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-[4.5rem] md:px-2" : "md:w-64"}`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
          title="Fechar menu"
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-ink-400 hover:text-white md:hidden"
        >
          <CloseIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-8 hidden size-6 items-center justify-center rounded-full border border-white/10 bg-brand-from text-ink-400 shadow-md transition-colors hover:text-white md:flex"
        >
          {collapsed ? <ExpandIcon className="size-3.5" /> : <CollapseIcon className="size-3.5" />}
        </button>

      <div>
        <Link
          href="/painel"
          className={`mb-8 flex items-center gap-2.5 ${effectiveCollapsed ? "justify-center px-0" : "px-2"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imagemmenu.png" alt="AuditR" className="h-9 w-9 shrink-0" />
          {!effectiveCollapsed && (
            <div>
              <p className="font-display text-base leading-none text-white">AuditR</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">Contratos</p>
            </div>
          )}
        </Link>

        <SidebarNav role={role} collapsed={effectiveCollapsed} />
      </div>

      <div>
        <div className="h-px bg-white/10" />
        <div className={`flex items-center pt-3 ${effectiveCollapsed ? "justify-center" : "justify-between px-2"}`}>
          {!effectiveCollapsed && (
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
          <ThemeToggle collapsed={effectiveCollapsed} />
        </div>

        {effectiveCollapsed && (
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

        <form action={logoutAction} className={effectiveCollapsed ? "mt-3 flex justify-center" : "px-2 pt-3"}>
          <button
            type="submit"
            title="Sair"
            className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-white"
          >
            <LogoutIcon className="size-3.5" />
            {!effectiveCollapsed && "Sair"}
          </button>
        </form>
      </div>
      </aside>
    </>
  );
}
