interface HelpSection {
  title: string;
  items: { question: string; answer: string }[];
}

const SECTIONS: HelpSection[] = [
  {
    title: "Clientes",
    items: [
      {
        question: "Como cadastro um cliente?",
        answer:
          'Vá em "Clientes" → "+ Novo cliente" e preencha os dados de PF ou PJ (CPF/CNPJ, contato, endereço). Também é possível importar vários clientes de uma vez pela planilha modelo disponível na própria tela.',
      },
      {
        question: "Para que serve o botão de ativar/desativar cliente?",
        answer:
          "Clientes inativos ficam fora da lista de envio de contrato, mas continuam com o histórico preservado. Use para clientes que encerraram o relacionamento com o escritório sem perder os contratos já gerados.",
      },
    ],
  },
  {
    title: "Enviar um contrato",
    items: [
      {
        question: "Como gero e envio um contrato para um cliente?",
        answer:
          'Na tela de "Clientes", clique em "Enviar contrato" na linha do cliente desejado. Escolha o modelo, opcionalmente um título (se deixar em branco, usa o nome do cliente), o valor acordado e, se quiser, uma cláusula personalizada da biblioteca para anexar ao final do documento.',
      },
      {
        question: 'Qual a diferença entre "Salvar como rascunho" e "Enviar para assinatura"?',
        answer:
          'Rascunho gera o contrato (.docx e .pdf) sem notificar o cliente — fica disponível em "Contratos" para revisão. "Enviar para assinatura" já dispara o e-mail (e WhatsApp, se configurado) com o código de 6 dígitos para o cliente assinar eletronicamente.',
      },
      {
        question: "O contrato já sai assinado pelo escritório?",
        answer:
          'Sim. O PDF gerado já inclui, ao final, o bloco de assinatura de todos os sócios cadastrados em "Minha empresa" (nome, cargo, CPF e código de assinatura eletrônica) — só falta a assinatura do cliente.',
      },
    ],
  },
  {
    title: "Modelos de contrato",
    items: [
      {
        question: "Como cadastro um modelo?",
        answer:
          'Em "Modelos" → "+ Novo modelo", envie um arquivo .docx com placeholders no formato {chave} nos trechos que devem ser preenchidos automaticamente (ex.: {cliente_nome}, {contrato_valor}). A lista completa de placeholders disponíveis aparece na tela de geração do contrato.',
      },
    ],
  },
  {
    title: "Biblioteca de Cláusulas",
    items: [
      {
        question: "Para que serve a biblioteca de cláusulas?",
        answer:
          "Guarda cláusulas reutilizáveis (com histórico de versões) que podem ser anexadas a um contrato específico na hora do envio, sem precisar editar o modelo .docx. Só cláusulas com status \"Aprovada\" aparecem na lista de seleção do envio de contrato.",
      },
      {
        question: "Como aprovo uma nova versão de uma cláusula?",
        answer:
          'Ao criar uma nova versão de uma cláusula existente, ela passa a ser a versão vigente automaticamente e o status muda para "Aprovada" — a versão anterior fica preservada no histórico.',
      },
    ],
  },
  {
    title: "Assinatura eletrônica",
    items: [
      {
        question: "Como o cliente assina o contrato?",
        answer:
          "O cliente recebe um e-mail (e WhatsApp, se configurado) com um link e um código de 6 dígitos. Ao acessar o link e digitar o código, a assinatura é registrada e o PDF final passa a incluir uma página de certificação com IP, data/hora, geolocalização aproximada e o hash do documento original.",
      },
      {
        question: "O que acontece se o código expirar ou for digitado errado?",
        answer:
          "O código tem validade limitada e um número máximo de tentativas. Se expirar ou esgotar as tentativas, reenvie o contrato para assinatura pela tela do contrato para gerar um novo código.",
      },
    ],
  },
  {
    title: "Minha empresa",
    items: [
      {
        question: "O que cadastro em Minha empresa?",
        answer:
          "Dados da organização (razão social, CNPJ, endereço, contato) usados como contratante nos documentos gerados, os sócios que assinam automaticamente os contratos (nome, CPF, cargo) e a equipe do escritório com convites por e-mail. Disponível só para o perfil Sócio.",
      },
      {
        question: "Como convido um novo usuário para o escritório?",
        answer:
          'Em "Minha empresa" → aba de equipe, informe o e-mail e o perfil (Sócio ou Funcionário) e envie o convite. A pessoa recebe um link para criar a própria conta já vinculada à organização.',
      },
    ],
  },
  {
    title: "Perfil",
    items: [
      {
        question: "Onde altero meus dados pessoais?",
        answer: 'Em "Perfil" (menu do usuário) você edita nome, e-mail e foto. O CPF é somente leitura.',
      },
    ],
  },
];

export default function AjudaPage() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Suporte</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Ajuda</h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        Orientações rápidas de como usar cada parte do AuditR.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="overflow-hidden rounded-card border border-edge bg-card shadow-sm shadow-ink-900/5"
          >
            <h2 className="border-b border-edge bg-mist px-5 py-3 text-sm font-medium text-ink_text">
              {section.title}
            </h2>
            <div className="divide-y divide-edge">
              {section.items.map((item) => (
                <div key={item.question} className="px-5 py-4">
                  <p className="text-sm font-medium text-ink_text">{item.question}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
