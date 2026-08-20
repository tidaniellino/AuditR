import { ClientForm } from "./ClientForm";

export default function NovoClientePage() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Cadastro</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">Novo cliente</h1>
      <p className="mb-8 mt-2 text-sm text-muted">
        Para pessoa jurídica, use &ldquo;Buscar na Receita Federal&rdquo; para preencher os dados
        automaticamente.
      </p>
      <ClientForm />
    </div>
  );
}
