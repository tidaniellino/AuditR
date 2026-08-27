"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/dashboard/icons";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  if (theme === null) {
    // Evita mismatch de hidratação — o tema real já foi aplicado por um
    // script inline no <head> antes do React montar; só não sabemos ainda
    // qual é neste componente client.
    return <div className="h-8 w-8" />;
  }

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      className="flex size-8 shrink-0 items-center justify-center rounded-card text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      {!collapsed && <span className="sr-only">Alternar tema</span>}
    </button>
  );
}
