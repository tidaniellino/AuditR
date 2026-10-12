import Link from "next/link";
import { CheckIcon, DownloadIcon, ContractsIcon, ClientsIcon } from "@/components/dashboard/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FaqItem } from "@/components/landing/FaqItem";
import { buildWhatsAppLink } from "@/lib/calculos/whatsapp-link";

export const metadata = {
  title: "Cálculos Trabalhistas — AuditR",
  description:
    "Cálculos trabalhistas no PJe-Calc em até 48 h: arquivo .pjc pronto pra importar no PJe e relatório completo em PDF, feitos por contador registrado no CRC-MG.",
};

// Mesmo número impresso no banner (public/calculos/capa.png) — se trocar um,
// trocar o outro.
const WHATSAPP_NUMERO = "5531990676772";
const WHATSAPP_MENSAGEM = "Olá, gostaria de saber mais sobre o processo de cálculo trabalhista";
const WHATSAPP_HREF = buildWhatsAppLink(WHATSAPP_NUMERO, WHATSAPP_MENSAGEM);

const ENTREGAS = [
  {
    Icon: DownloadIcon,
    title: "Arquivo .pjc",
    body: "O cálculo pronto no formato do PJe-Calc, pra importar direto no PJe — sem redigitar nada.",
  },
  {
    Icon: ContractsIcon,
    title: "Relatório completo em PDF",
    body: "Memória de cálculo verba a verba, pra conferir, anexar à peça e explicar o valor pro cliente.",
  },
  {
    Icon: ClientsIcon,
    title: "Contador registrado no CRC-MG",
    body: "Cálculo feito por profissional habilitado, com atendimento a escritórios de todo o Brasil.",
  },
];

const FASES = [
  {
    title: "Cálculo da inicial",
    body: "Valor da causa e pedidos liquidados antes de ajuizar a reclamação trabalhista.",
  },
  {
    title: "Liquidação de sentença",
    body: "Apuração do valor devido depois da condenação, com correção monetária e juros.",
  },
  {
    title: "Impugnação de cálculos",
    body: "Conferência dos cálculos da parte contrária ou do perito, apontando as divergências.",
  },
  {
    title: "Verbas rescisórias",
    body: "Rescisão sem justa causa, pedido de demissão, justa causa ou acordo (Art. 484-A da CLT).",
  },
];

const VERBAS = [
  "Horas extras e reflexos",
  "Saldo de salário",
  "Aviso prévio",
  "Férias + 1/3",
  "13º salário",
  "FGTS + multa de 40%",
  "Correção monetária e juros",
  "Descontos de INSS e IRRF",
];

const PASSOS = [
  {
    when: "Passo 1",
    title: "Você chama no WhatsApp",
    body: "Conta qual é o caso e envia os documentos — petição ou sentença, holerites, cartões de ponto, TRCT.",
  },
  {
    when: "Passo 2",
    title: "O contador faz o cálculo no PJe-Calc",
    body: "Cada verba é apurada no sistema oficial da Justiça do Trabalho, com correção e descontos legais.",
  },
  {
    when: "Em até 48 h",
    title: "Você recebe o .pjc e o PDF",
    body: "O arquivo pronto pra importar no PJe e o relatório completo, direto no seu WhatsApp.",
  },
];

// Exemplo ilustrativo pro mock do hero — os valores fecham (soma − descontos = líquido).
const MOCK_RESUMO = [
  { verba: "Horas extras 50%", valor: "18.420,55" },
  { verba: "Reflexos", valor: "6.112,30" },
  { verba: "FGTS + multa 40%", valor: "4.871,18" },
  { verba: "Correção e juros", valor: "2.904,62" },
  { verba: "(−) INSS e IRRF", valor: "− 3.716,40" },
];
const MOCK_LIQUIDO = "28.592,25";

const FAQ = [
  {
    q: "Preciso ter conta no AuditR pra pedir um cálculo?",
    a: "Não. O pedido é feito direto pelo WhatsApp — basta enviar os documentos do caso.",
  },
  {
    q: "O arquivo .pjc funciona no meu PJe?",
    a: "Sim. O .pjc é o formato de exportação do próprio PJe-Calc, usado pra importar o cálculo no processo eletrônico.",
  },
  {
    q: "Vocês atendem fora de Minas Gerais?",
    a: "Sim. O contador é registrado no CRC-MG, mas o atendimento é 100% online e vale pra escritórios de todo o Brasil.",
  },
  {
    q: "Quais documentos preciso enviar?",
    a: "Depende da fase do processo. Em geral: petição inicial ou sentença, holerites, cartões de ponto e o TRCT. Se faltar algo, o contador avisa pelo WhatsApp.",
  },
  {
    q: "Quanto custa?",
    a: "O valor depende do tipo e da complexidade do cálculo. Chame no WhatsApp pra receber um orçamento do seu caso.",
  },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.9.99 6.68 2.77a9.38 9.38 0 0 1 2.76 6.68c0 5.2-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.04.7C5.77.7.67 5.8.67 12.07c0 2 .52 3.96 1.52 5.69L.57 23.3l5.67-1.49a11.33 11.33 0 0 0 5.8 1.48h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.34-8.04z" />
    </svg>
  );
}

function WhatsAppButton({ label = "Falar no WhatsApp", size = "lg" }: { label?: string; size?: "sm" | "lg" }) {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-card bg-[#1f9d4c] font-medium text-white transition-colors hover:bg-[#1a8a42] ${
        size === "lg" ? "px-6 py-3 text-sm" : "px-4 py-2.5 text-sm"
      }`}
    >
      <WhatsAppIcon className={size === "lg" ? "size-5" : "size-4"} />
      {label}
    </a>
  );
}

export default function CalculosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-edge bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/imagemmenu.png" alt="AuditR" className="h-8 w-8" />
            <p className="font-display text-base text-ink_text">AuditR</p>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted lg:flex">
            <a href="#o-que-voce-recebe" className="hover:text-ink_text">O que você recebe</a>
            <a href="#tipos-de-calculo" className="hover:text-ink_text">Tipos de cálculo</a>
            <a href="#como-funciona" className="hover:text-ink_text">Como funciona</a>
            <a href="#duvidas" className="hover:text-ink_text">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="header" />
            <WhatsAppButton label="WhatsApp" size="sm" />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-audit-grid overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-block rounded-full border border-edge bg-mist px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                AuditR · Cálculos trabalhistas
              </span>
              <h1 className="mt-4 font-display text-4xl leading-[1.1] text-ink_text sm:text-5xl">
                Cálculos trabalhistas no <span className="text-info">PJe-Calc</span> em até 48 h.
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted">
                Você manda os documentos do caso pelo WhatsApp. Um contador registrado no CRC-MG faz o cálculo
                no PJe-Calc e devolve o arquivo .pjc pronto pra importar no PJe, junto com o relatório completo em
                PDF.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <WhatsAppButton />
                <a
                  href="#como-funciona"
                  className="btn-secondary inline-flex items-center justify-center rounded-card px-6 py-3 text-sm font-medium"
                >
                  Ver como funciona
                </a>
              </div>
              <p className="mt-4 text-sm text-muted">(31) 99067-6772 · Atendimento em todo o Brasil</p>
            </div>

            {/* Mock: resumo do cálculo + os dois arquivos entregues */}
            <div className="rounded-2xl border border-white/10 bg-ink-950 p-3 shadow-xl shadow-ink-900/10 sm:p-4">
              <div className="flex items-center gap-1.5 px-1 pb-3">
                <span className="size-2 rounded-full bg-white/20" />
                <span className="size-2 rounded-full bg-white/20" />
                <span className="size-2 rounded-full bg-white/20" />
                <span className="ml-2 text-xs font-medium text-white">Resumo do cálculo · PJe-Calc</span>
              </div>
              <div className="overflow-hidden rounded-card border border-edge bg-card">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {MOCK_RESUMO.map((linha) => (
                      <tr key={linha.verba} className="border-b border-edge">
                        <td className="px-4 py-2.5 text-ink_text">{linha.verba}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-ink_text">{linha.valor}</td>
                      </tr>
                    ))}
                    <tr className="bg-mist">
                      <td className="px-4 py-3 font-medium text-ink_text">Líquido</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-info">
                        R$ {MOCK_LIQUIDO}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-card bg-white/5 px-3 py-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-via font-mono text-[10px] font-medium text-white">
                    .PJC
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">calculo.pjc</p>
                    <p className="truncate text-xs text-ink-400">pra importar no PJe</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-card bg-white/5 px-3 py-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-stamp font-mono text-[10px] font-medium text-white">
                    PDF
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">relatorio.pdf</p>
                    <p className="truncate text-xs text-ink-400">memória de cálculo completa</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 px-1 text-[11px] text-ink-400">Valores meramente ilustrativos.</p>
            </div>
          </div>
        </section>

        {/* O que você recebe — faixa escura, mesma da home */}
        <section id="o-que-voce-recebe" className="bg-ink-950 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">O que você recebe</p>
            <div className="mt-8 grid gap-10 sm:grid-cols-3">
              {ENTREGAS.map(({ Icon, title, body }) => (
                <div key={title}>
                  <div className="flex size-10 items-center justify-center rounded-card bg-white/10 text-brand-to">
                    <Icon />
                  </div>
                  <p className="mt-4 font-medium text-white">{title}</p>
                  <p className="mt-1.5 text-sm text-ink-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tipos de cálculo + verbas */}
        <section id="tipos-de-calculo" className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Tipos de cálculo</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl text-ink_text">
            Da petição inicial à liquidação, em qualquer fase do processo.
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {FASES.map((fase) => (
              <div key={fase.title} className="rounded-2xl border border-edge bg-card p-6 shadow-sm shadow-ink-900/5">
                <p className="font-display text-xl text-ink_text">{fase.title}</p>
                <p className="mt-1.5 text-sm text-muted">{fase.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <p className="font-medium text-ink_text">Verbas apuradas</p>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {VERBAS.map((verba) => (
                <li key={verba} className="flex items-start gap-2.5 text-sm text-ink_text">
                  <CheckIcon className="mt-0.5 shrink-0 text-seal" />
                  {verba}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              Tem uma verba que não está na lista? Pergunte no WhatsApp — a lista acima são só as mais comuns.
            </p>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="bg-mist py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Como funciona</p>
            <h2 className="mt-2 font-display text-3xl text-ink_text">Três passos, tudo pelo WhatsApp.</h2>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {PASSOS.map((passo, i) => (
                <div key={passo.title}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-2 shrink-0 rounded-full ${i === PASSOS.length - 1 ? "bg-seal" : "bg-brand-via"}`}
                    />
                    <span className="h-px flex-1 bg-edge" />
                  </div>
                  <p className="mt-4 font-mono text-xs uppercase tracking-wide text-muted">{passo.when}</p>
                  <p className="mt-1 font-medium text-ink_text">{passo.title}</p>
                  <p className="mt-1.5 text-sm text-muted">{passo.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <WhatsAppButton label="Enviar meu caso" />
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl text-ink_text">Dúvidas</h2>
            <div className="mt-8">
              {FAQ.map((item) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-ink-950 py-16">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6">
            <div>
              <h2 className="font-display text-3xl text-white">Seu cálculo pronto em até 48 h.</h2>
              <p className="mt-2 max-w-lg text-sm text-ink-400">
                Arquivo .pjc + relatório em PDF, feitos por contador registrado no CRC-MG. Atendimento em todo o
                Brasil.
              </p>
            </div>
            <WhatsAppButton />
          </div>
        </section>
      </main>

      <footer className="border-t border-edge px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} AuditR. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-ink_text">Contratos</Link>
            <Link href="/termos" className="hover:text-ink_text">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-ink_text">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
