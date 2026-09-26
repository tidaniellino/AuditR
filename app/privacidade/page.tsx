export const metadata = { title: "Política de Privacidade — AuditR" };

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Legal</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Política de Privacidade</h1>
      <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-muted">
        <p>
          Esta Política de Privacidade descreve como o AuditR coleta, usa e protege dados pessoais,
          em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
        <p>
          <strong className="text-ink_text">Dados coletados no cadastro:</strong> nome, e-mail e senha
          (armazenada com hash, nunca em texto puro). CPF ou CNPJ só é solicitado quando necessário
          para gerar um contrato com validade jurídica, nunca antes.
        </p>
        <p>
          <strong className="text-ink_text">Login com Google:</strong> ao continuar com sua conta
          Google, recebemos apenas seu nome, e-mail e foto de perfil públicos — nunca sua senha do
          Google, e nunca acessamos outros dados da sua conta Google.
        </p>
        <p>
          <strong className="text-ink_text">Uso dos dados:</strong> os dados cadastrais são usados
          exclusivamente para operar a plataforma (autenticação, geração de contratos, comunicação
          sobre sua conta) e não são vendidos a terceiros.
        </p>
        <p>
          <strong className="text-ink_text">Seus direitos:</strong> você pode solicitar a qualquer
          momento a correção ou exclusão dos seus dados pessoais, conforme os direitos garantidos
          pela LGPD.
        </p>
      </div>
    </div>
  );
}
