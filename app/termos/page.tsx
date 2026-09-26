export const metadata = { title: "Termos de Uso — AuditR" };

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Legal</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Termos de Uso</h1>
      <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-muted">
        <p>
          Estes Termos de Uso regem o acesso e uso da plataforma AuditR, destinada à geração,
          gestão e assinatura eletrônica de contratos por escritórios de advocacia e contabilidade.
        </p>
        <p>
          Ao criar uma conta, você declara ter capacidade legal para contratar em nome do escritório
          cadastrado e concorda em usar a plataforma de acordo com a legislação brasileira aplicável,
          incluindo a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
        <p>
          O AuditR é uma ferramenta de apoio à geração de documentos — a responsabilidade pela
          adequação jurídica e contábil do conteúdo dos contratos gerados é do profissional que os
          utiliza.
        </p>
        <p>
          Reservamo-nos o direito de suspender contas que violem estes termos ou a legislação
          vigente. Dúvidas sobre estes termos podem ser enviadas para o suporte da plataforma.
        </p>
      </div>
    </div>
  );
}
