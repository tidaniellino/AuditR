import { buildWhatsAppLink } from "@/lib/calculos/whatsapp-link";

export const metadata = {
  title: "Cálculos Trabalhistas — AuditR",
  description: "Cálculos trabalhistas no PJe-Calc em até 48 h, com arquivo .pjc e relatório em PDF.",
};

// Mesmo número impresso no banner (public/calculos/capa.png) — se trocar um,
// trocar o outro.
const WHATSAPP_NUMERO = "5531990676772";
const WHATSAPP_MENSAGEM = "Olá, gostaria de saber mais sobre o processo de cálculo trabalhista";

export default function CalculosPage() {
  const whatsappHref = buildWhatsAppLink(WHATSAPP_NUMERO, WHATSAPP_MENSAGEM);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b2f4c] px-4 py-10">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl shadow-black/40 transition-transform hover:scale-[1.01]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/calculos/capa.png"
          alt="Cálculos trabalhistas no PJe-Calc em até 48 h — arquivo .pjc + relatório em PDF, contador registrado no CRC-MG. WhatsApp (31) 99067-6772."
          className="w-full"
        />
      </a>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-[#1f9d4c] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/30 transition-colors hover:bg-[#1a8a42]"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.9.99 6.68 2.77a9.38 9.38 0 0 1 2.76 6.68c0 5.2-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.04.7C5.77.7.67 5.8.67 12.07c0 2 .52 3.96 1.52 5.69L.57 23.3l5.67-1.49a11.33 11.33 0 0 0 5.8 1.48h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.34-8.04z" />
        </svg>
        Falar no WhatsApp
      </a>
      <p className="mt-3 text-center text-sm text-white/60">(31) 99067-6772 · Atendimento em todo o Brasil</p>
    </main>
  );
}
