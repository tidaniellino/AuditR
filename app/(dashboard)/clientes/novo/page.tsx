import { ClientForm } from "./ClientForm";
import { ImportPanel } from "@/components/dashboard/ImportPanel";
import { importClientsFromExcel } from "../actions";

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

      <div className="mt-10 max-w-xl border-t border-edge pt-6">
        <p className="mb-3 text-sm text-muted">Ou importe vários clientes de uma vez a partir de uma planilha:</p>
        <ImportPanel
          title="Importar clientes de uma planilha"
          description="Baixe o modelo, preencha uma linha por cliente e envie o arquivo de volta."
          templateHref="/clientes/modelo"
          action={importClientsFromExcel}
        />
      </div>
    </div>
  );
}
