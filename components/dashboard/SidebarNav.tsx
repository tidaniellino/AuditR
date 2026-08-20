"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientsIcon, ClausesIcon, TemplatesIcon, ContractsIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/clientes", label: "Clientes", Icon: ClientsIcon },
  { href: "/clausulas", label: "Cláusulas", Icon: ClausesIcon },
  { href: "/modelos", label: "Modelos", Icon: TemplatesIcon },
  { href: "/contratos", label: "Contratos", Icon: ContractsIcon },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-3 rounded-card border-l-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-brand-to bg-white/10 text-white"
                : "border-transparent text-ink-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className={active ? "text-brand-to" : "text-ink-400 group-hover:text-white"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
