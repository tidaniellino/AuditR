import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#101B30",
          900: "#14213B",
          800: "#1E2F52",
          600: "#47597C",
          400: "#8291AC",
        },
        paper: {
          50: "#FAF8F3",
          100: "#F1EEE6",
          200: "#E7E2D6",
        },
        hairline: "#DEDACF",
        stamp: {
          DEFAULT: "#A8391F",
          dim: "#832C16",
          light: "#C1573C",
          tint: "#F5E5DF",
        },
        seal: {
          DEFAULT: "#3F5D42",
          tint: "#E7EDE4",
        },
        // Azul de status "enviado para assinatura" (distinto do brand-via, que é teal).
        info: {
          DEFAULT: "#2354C7",
          tint: "#E6ECFB",
        },
        brand: {
          from: "#123A5E",
          via: "#1B6E86",
          to: "#33A66E",
          tint: "#E4F1EB",
        },
        mist: "#F6F8F9",
        edge: "#E4E8EC",
        ink_text: "#1C1D22",
        muted: "#6B6A63",
        // Tokens shadcn/ui espera nos componentes gerados (bg-primary, border-border, etc.).
        // "muted"/"muted-foreground" ficam de fora de propósito: "muted" já é usado em todo
        // o app como cor de texto secundário (text-muted) e não pode virar um fundo claro.
        background: "#FAF8F3",
        foreground: "#1C1D22",
        card: { DEFAULT: "#FFFFFF", foreground: "#1C1D22" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#1C1D22" },
        primary: { DEFAULT: "#1B6E86", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#F6F8F9", foreground: "#1C1D22" },
        accent: { DEFAULT: "#E4F1EB", foreground: "#123A5E" },
        destructive: { DEFAULT: "#A8391F", foreground: "#FFFFFF" },
        border: "#E4E8EC",
        input: "#E4E8EC",
        ring: "#1B6E86",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #123A5E 0%, #1B6E86 55%, #33A66E 100%)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
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
