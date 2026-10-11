"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientsIcon, ClausesIcon, TemplatesIcon, ContractsIcon, BuildingIcon, HelpIcon, CardIcon, HomeIcon, CalculatorIcon } from "./icons";
import { canManageOrg, type UserRole } from "@/lib/auth/permissions";

const NAV_ITEMS = [
  { href: "/painel", label: "Painel", Icon: HomeIcon },
  { href: "/clientes", label: "Clientes", Icon: ClientsIcon },
  { href: "/clausulas", label: "Cláusulas", Icon: ClausesIcon },
  { href: "/modelos", label: "Modelos", Icon: TemplatesIcon },
  { href: "/contratos", label: "Contratos", Icon: ContractsIcon },
  // Início de um 2º módulo do backoffice (não é CRUD de contrato) — só um
  // separador visual por enquanto; revisitar se um 3º módulo aparecer.
  { href: "/calculos", label: "Cálculos Trabalhistas", Icon: CalculatorIcon, novoGrupo: true },
  { href: "/assinatura", label: "Assinatura", Icon: CardIcon },
  { href: "/ajuda", label: "Ajuda", Icon: HelpIcon },
];

export function SidebarNav({
  role,
  collapsed = false,
}: {
  role: UserRole | null | undefined;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const items = canManageOrg(role)
    ? [...NAV_ITEMS, { href: "/empresa", label: "Minha empresa", Icon: BuildingIcon }]
    : NAV_ITEMS;

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, Icon, novoGrupo }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <div key={href}>
            {novoGrupo && <div className="my-2 h-px bg-white/10" />}
            <Link
              href={href}
              title={collapsed ? label : undefined}
              className={`group flex items-center gap-3 rounded-card border-l-2 py-2 text-sm transition-colors ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                active
                  ? "border-brand-to bg-white/10 text-white"
                  : "border-transparent text-ink-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={active ? "text-brand-to" : "text-ink-400 group-hover:text-white"} />
              {!collapsed && label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
