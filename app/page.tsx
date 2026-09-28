import Link from "next/link";
import {
  CheckIcon,
  TemplatesIcon,
  SignatureIcon,
  ClientsIcon,
} from "@/components/dashboard/icons";
import { PLAN_LIMITS, PLAN_ADMIN_LIMITS, PLAN_PRICES } from "@/lib/billing/limits";
import { STATUS_DISPLAY } from "@/lib/contracts/status";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FaqItem } from "@/components/landing/FaqItem";

const PLANS = [
  {
    key: "free",
    label: "Gratuito",
    price: 0,
    description: "Para testar a geração de contratos sem compromisso.",
    features: [
      `${PLAN_LIMITS.free} contratos gerados (vitalício)`,
      `${PLAN_ADMIN_LIMITS.free} usuário administrador`,
      "Modelos e cláusulas inclusos",
    ],
    highlighted: false,
  },
  {
    key: "profissional",
    label: "Profissional",
    price: PLAN_PRICES.profissional,
    description: "Para escritórios com fluxo constante de contratos.",
    features: [
      `${PLAN_LIMITS.profissional} contratos gerados por mês`,
      `${PLAN_ADMIN_LIMITS.profissional} usuário administrador`,
      "Armazenamento ilimitado de documentos assinados",
      "Suporte por e-mail",
    ],
    highlighted: false,
  },
  {
    key: "corporativo",
    label: "Corporativo",
    price: PLAN_PRICES.corporativo,
    description: "Para escritórios maiores, com times e alto volume.",
    features: [
      `${PLAN_LIMITS.corporativo} contratos gerados por mês`,
      `Até ${PLAN_ADMIN_LIMITS.corporativo} usuários administradores`,
      "Envio do código de assinatura por WhatsApp",
      "Suporte prioritário",
    ],
    highlighted: true,
  },
] as const;

const MOCK_CONTRACTS = [
  { title: "Prestação de serviço", client: "Marina Costa", status: "aguardando_assinatura" as const },
  { title: "Contrato de locação", client: "Tomás Ribeiro", status: "assinado" as const },
  { title: "Consultoria mensal", client: "Beatriz Lima", status: "rascunho" as const },
  { title: "Parceria comercial", client: "Pedro Gomes", status: "assinado" as const },
];

const STEPS = [
  {
    when: "Agora",
    title: "Você monta o contrato",
    body: "Escolha um cliente e um modelo — ou envie um .docx já pronto. O AuditR preenche nome, CPF/CNPJ e endereço automaticamente.",
  },
  {
    when: "Instantâneo",
    title: "O código de assinatura é enviado",
    body: "Por e-mail (ou WhatsApp, se configurado), com um link direto pro contrato e um código de 6 dígitos válido por 24h.",
  },
  {
    when: "Quando o cliente assinar",
    title: "Você recebe a prova",
    body: "Um clique confirma a assinatura. O PDF final sai com hash de validação e IP registrado — consultável na página do contrato.",
  },
];

const FEATURES = [
  {
    Icon: TemplatesIcon,
    title: "Modelos e cláusulas",
    body: "Biblioteca reutilizável, com modelos prontos do sistema e cláusulas próprias do seu escritório.",
  },
  {
    Icon: SignatureIcon,
    title: "Assinatura com trilha de auditoria",
    body: "Código de verificação, hash do documento, IP e navegador — tudo registrado, tudo consultável depois.",
  },
  {
    Icon: ClientsIcon,
    title: "Clientes PF e PJ",
    body: "CPF ou CNPJ é pedido só quando necessário — e CNPJ preenche razão social e endereço pela Receita Federal.",
  },
];

const FAQ = [
  {
    q: "Preciso instalar algo?",
    a: "Não. O AuditR funciona no navegador. Seus clientes recebem só um link e um código por e-mail (ou WhatsApp) — não precisam criar conta nem instalar nada.",
  },
  {
    q: "O contrato assinado tem validade jurídica?",
    a: "Cada assinatura registra o código verificado, IP, navegador e um hash único do documento final, formando uma trilha de auditoria consultável na página do contrato.",
  },
  {
    q: "Posso enviar um contrato que eu já tenho pronto?",
    a: "Sim — na tela de novo contrato dá pra escolher entre montar a partir de um modelo ou subir direto um arquivo .docx já pronto para assinatura.",
  },
  {
    q: "Preciso do CPF ou CNPJ do cliente para cadastrar?",
    a: "Não no cadastro. Ele só é pedido quando você for gerar o primeiro contrato — e só uma vez.",
  },
  {
    q: "Já tenho uma planilha de clientes, dá pra importar?",
    a: "Sim, existe um modelo de planilha (Excel) pra importar vários clientes de uma vez, direto na tela de Clientes.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa — seu plano continua ativo até o fim do período já pago.",
  },
];

function formatPrice(value: number) {
  if (value === 0) return "Grátis";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-edge bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/imagemmenu.png" alt="AuditR" className="h-8 w-8" />
            <div>
              <p className="font-display text-base leading-none text-ink_text">AuditR</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Contratos</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted lg:flex">
            <a href="#como-funciona" className="hover:text-ink_text">Como funciona</a>
            <a href="#recursos" className="hover:text-ink_text">Recursos</a>
            <a href="#planos" className="hover:text-ink_text">Preços</a>
            <a href="#duvidas" className="hover:text-ink_text">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="header" />
            <Link href="/login" className="rounded-card px-3 py-2 text-sm font-medium text-ink_text hover:text-brand-via">
              Entrar
            </Link>
            <Link
              href="/onboarding"
              className="btn-primary inline-flex items-center justify-center rounded-card px-4 py-2.5 text-sm font-medium"
            >
              Comece agora
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-audit-grid overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">AuditR</p>
              <h1 className="mt-3 font-display text-4xl leading-[1.1] text-ink_text sm:text-5xl">
                Do modelo à assinatura, sem sair de uma tela.
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted">
                O AuditR monta o contrato a partir do seu modelo — ou de um .docx que você já tem —, envia o
                código de assinatura por e-mail e guarda o hash de validação de cada documento assinado.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/onboarding"
                  className="btn-primary inline-flex items-center justify-center rounded-card px-6 py-3 text-sm font-medium"
                >
                  Criar conta grátis
                </Link>
                <a
                  href="#como-funciona"
                  className="btn-secondary inline-flex items-center justify-center rounded-card px-6 py-3 text-sm font-medium"
                >
                  Ver como funciona
                </a>
              </div>
              <p className="mt-4 text-sm text-muted">
                Grátis para os {PLAN_LIMITS.free} primeiros contratos. Sem cartão de crédito.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5">
              {/* Mock: lista real de contratos, dentro de uma moldura escura */}
              <div className="rounded-2xl border border-white/10 bg-ink-950 p-3 shadow-xl shadow-ink-900/10 sm:p-4">
                <div className="flex items-center gap-1.5 px-1 pb-3 text-xs">
                  <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white">Todos</span>
                  <span className="rounded-full px-3 py-1 text-ink-400">Aguardando</span>
                  <span className="rounded-full px-3 py-1 text-ink-400">Assinado</span>
                </div>
                <div className="overflow-hidden rounded-card border border-edge bg-card">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-edge bg-mist text-[10px] uppercase tracking-wide text-muted">
                        <th className="px-3 py-2 font-medium">Contrato</th>
                        <th className="px-3 py-2 font-medium">Cliente</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_CONTRACTS.map((c) => (
                        <tr key={c.title} className="border-b border-edge last:border-0">
                          <td className="px-3 py-2.5 font-medium text-ink_text">{c.title}</td>
                          <td className="px-3 py-2.5 text-muted">{c.client}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${STATUS_DISPLAY[c.status].badgeClass}`}
                            >
                              {STATUS_DISPLAY[c.status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mock: prévia da mensagem de assinatura no celular do cliente */}
              <div className="rounded-2xl border border-white/10 bg-ink-950 p-4 shadow-xl shadow-ink-900/10 sm:p-5">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-seal text-white">
                    <SignatureIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">Escritório Modelo</p>
                    <p className="truncate text-xs text-ink-400">Contrato de prestação de serviço</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <p className="max-w-[88%] self-start rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-2.5 text-sm text-white">
                    Olá, Marina. Seu contrato está pronto para assinatura. Use o código abaixo — válido por
                    24h.
                  </p>
                  <p className="self-start rounded-card bg-white/5 px-3.5 py-2 font-mono text-lg tracking-[0.3em] text-seal">
                    482913
                  </p>
                  <span className="self-start rounded-card bg-seal px-4 py-2 text-sm font-medium text-white">
                    Assinar contrato →
                  </span>
                  <p className="mt-2 max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-brand-via px-3.5 py-2.5 text-sm text-white">
                    ✅ Assinado — hash 7f3a…c2e9
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dores */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-xl font-display text-3xl text-ink_text">
            Cada contrato manual é uma hora que você não cobra.
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <div className="h-px w-full bg-stamp/40" />
              <p className="mt-4 font-medium text-ink_text">O contrato trava no Word</p>
              <p className="mt-1.5 text-sm text-muted">
                Copiar dados do cliente pra cada cláusula manualmente é lento — e é ali que nome, CPF e valor
                saem errados.
              </p>
            </div>
            <div>
              <div className="h-px w-full bg-stamp/40" />
              <p className="mt-4 font-medium text-ink_text">Você corre atrás de assinatura</p>
              <p className="mt-1.5 text-sm text-muted">
                Ligar, mandar e-mail, cobrar de novo — cada contrato parado é mais uma tarefa manual na sua
                lista.
              </p>
            </div>
            <div>
              <div className="h-px w-full bg-stamp/40" />
              <p className="mt-4 font-medium text-ink_text">Ninguém sabe o que já foi assinado</p>
              <p className="mt-1.5 text-sm text-muted">
                Sem um lugar único, saber o status de um contrato significa abrir pasta, e-mail e WhatsApp ao
                mesmo tempo.
              </p>
            </div>
          </div>

          <blockquote className="mt-12 border-l-2 border-brand-via pl-5 text-lg text-ink_text">
            O AuditR gera o contrato a partir do seu modelo, envia o código de assinatura e mostra o status
            de cada um — pra você nunca mais precisar perguntar &ldquo;esse aqui já foi assinado?&rdquo;
          </blockquote>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Fluxo</p>
          <h2 className="mt-2 font-display text-3xl text-ink_text">
            Três passos, e o do meio acontece sozinho.
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2 shrink-0 rounded-full ${i === STEPS.length - 1 ? "bg-seal" : "bg-brand-via"}`}
                  />
                  <span className="h-px flex-1 bg-edge" />
                </div>
                <p className="mt-4 font-mono text-xs uppercase tracking-wide text-muted">{step.when}</p>
                <p className="mt-1 font-medium text-ink_text">{step.title}</p>
                <p className="mt-1.5 text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recursos — faixa escura, mesma cor do menu do app */}
        <section id="recursos" className="bg-ink-950 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 sm:grid-cols-3">
              {FEATURES.map(({ Icon, title, body }) => (
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

        {/* Planos */}
        <section id="planos" className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Planos</p>
            <h2 className="mt-2 font-display text-3xl text-ink_text">Escolha o plano do seu escritório</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Comece grátis e faça upgrade quando precisar de mais volume — sem fidelidade.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border p-7 shadow-sm shadow-ink-900/5 ${
                  plan.highlighted ? "border-brand-via bg-ink-950 ring-1 ring-brand-via/30" : "border-edge bg-card"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-brand-via px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-white">
                    Mais popular
                  </span>
                )}

                <p className={`font-display text-xl ${plan.highlighted ? "text-white" : "text-ink_text"}`}>
                  {plan.label}
                </p>
                <p className={`mt-1 text-sm ${plan.highlighted ? "text-ink-400" : "text-muted"}`}>
                  {plan.description}
                </p>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className={`font-display text-4xl ${plan.highlighted ? "text-white" : "text-ink_text"}`}>
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className={`text-sm ${plan.highlighted ? "text-ink-400" : "text-muted"}`}>/mês</span>
                  )}
                </p>

                <ul className="mt-6 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2.5 text-sm ${plan.highlighted ? "text-white" : "text-ink_text"}`}
                    >
                      <CheckIcon className="mt-0.5 shrink-0 text-seal" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.price === 0 ? "/onboarding" : `/onboarding?plan=${plan.key}`}
                  className={`mt-7 inline-flex items-center justify-center rounded-card px-4 py-2.5 text-center text-sm font-medium ${
                    plan.highlighted ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {plan.price === 0 ? "Começar grátis" : `Assinar ${plan.label}`}
                </Link>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
            Todo plano inclui geração por modelo ou upload de contrato pronto, cláusulas reutilizáveis,
            cadastro de clientes PF/PJ e assinatura eletrônica com hash de validação.
          </p>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="bg-mist px-6 py-20">
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
        <section className="bg-ink-950 px-6 py-16">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl text-white">Pare de perseguir assinatura por WhatsApp.</h2>
              <p className="mt-2 max-w-lg text-sm text-ink-400">
                A configuração leva menos de dez minutos. Você traz o modelo, o AuditR cuida do resto.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="btn-primary inline-flex shrink-0 items-center justify-center rounded-card px-6 py-3 text-sm font-medium"
            >
              Criar conta grátis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-edge px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} AuditR. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/termos" className="hover:text-ink_text">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-ink_text">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
