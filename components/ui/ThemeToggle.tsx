"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/dashboard/icons";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

export function ThemeToggle({
  collapsed = false,
  variant = "sidebar",
}: {
  collapsed?: boolean;
  /** "sidebar" (padrão): pensado pro fundo navy fixo do menu. "header": pro
   *  cabeçalho claro da landing, onde o contraste precisa ser o oposto. */
  variant?: "sidebar" | "header";
}) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const variantClass =
    variant === "header"
      ? "text-muted hover:bg-mist hover:text-ink_text"
      : "text-ink-400 hover:bg-white/5 hover:text-white";

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
      className={`flex size-8 shrink-0 items-center justify-center rounded-card transition-colors ${variantClass}`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      {!collapsed && <span className="sr-only">Alternar tema</span>}
    </button>
  );
}
