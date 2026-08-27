import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Painel do menu lateral é sempre escuro (cor de marca fixa), não
        // varia com o tema — por isso continua literal, não vira variável.
        ink: {
          950: "#101B30",
          900: "#14213B",
          800: "#1E2F52",
          600: "#47597C",
          400: "#8291AC",
        },
        // Cores de marca também ficam fixas — identidade visual não deve
        // mudar entre os temas, só a superfície ao redor delas. Paleta
        // branco + azul marinho: um único matiz de azul, do mais escuro
        // (sidebar) ao mais claro (acentos/estados ativos).
        brand: {
          from: "#123A5E",
          via: "#1D4E89",
          to: "#2F6FB0",
          tint: "var(--brand-tint)",
        },
        // Daqui pra baixo: tokens de superfície/texto/estado, todos via
        // variável CSS (definida em globals.css) para dar suporte a dark mode.
        stamp: {
          DEFAULT: "var(--stamp)",
          dim: "var(--stamp-dim)",
          light: "var(--stamp-light)",
          tint: "var(--stamp-tint)",
        },
        seal: {
          DEFAULT: "var(--seal)",
          tint: "var(--seal-tint)",
        },
        // Azul de status "enviado para assinatura" (distinto do brand-via, que é teal).
        info: {
          DEFAULT: "var(--info)",
          tint: "var(--info-tint)",
        },
        mist: "var(--mist)",
        edge: "var(--edge)",
        ink_text: "var(--foreground)",
        muted: "var(--muted-foreground)",
        // Tokens shadcn/ui espera nos componentes gerados (bg-primary, border-border, etc.).
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--foreground)" },
        popover: { DEFAULT: "var(--card)", foreground: "var(--foreground)" },
        primary: { DEFAULT: "#1D4E89", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "var(--mist)", foreground: "var(--foreground)" },
        accent: { DEFAULT: "var(--brand-tint)", foreground: "#123A5E" },
        destructive: { DEFAULT: "var(--stamp)", foreground: "#FFFFFF" },
        border: "var(--edge)",
        input: "var(--edge)",
        ring: "#1D4E89",
      },
      fontFamily: {
        display: ["Arial", "Helvetica", "system-ui", "sans-serif"],
        sans: ["Arial", "Helvetica", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(4%, -6%) scale(1.08)" },
        },
        "logo-in": {
          "0%": { opacity: "0", transform: "scale(0.82) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        drift: "drift 10s ease-in-out infinite",
        "logo-in": "logo-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        rise: "rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
