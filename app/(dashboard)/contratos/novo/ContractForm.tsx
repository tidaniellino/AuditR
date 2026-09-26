"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { createContract, type ContractFormState } from "../actions";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";
import { OrgDocumentGateModal } from "@/components/contracts/OrgDocumentGateModal";

const initialState: ContractFormState = {};

const PLACEHOLDERS = [
  "cliente_nome",
  "cliente_cpf_cnpj",
  "cliente_email",
  "cliente_telefone",
  "cliente_endereco",
  "cliente_rg",
  "cliente_nome_fantasia",
  "cliente_representante_nome",
  "cliente_representante_cpf",
  "cliente_representante_rg",
  "contrato_titulo",
  "contrato_tipo",
  "contrato_valor",
  "escritorio_nome",
  "data_atual",
];

interface ClientOption {
  id: string;
  tipo_pessoa: "PF" | "PJ";
  cpf_cnpj: string;
  nome_razao_social: string;
  nome_fantasia: string | null;
  rg: string | null;
  endereco: Record<string, string | null> | null;
  representante: { full_name: string; cpf: string; rg: string | null } | null;
}

function enderecoToText(endereco: Record<string, string | null> | null): string {
  if (!endereco) return "";
  return [
    [endereco.logradouro, endereco.numero].filter(Boolean).join(", "),
    endereco.complemento ?? "",
    endereco.bairro ?? "",
    endereco.municipio && endereco.uf ? `${endereco.municipio}/${endereco.uf}` : endereco.municipio || endereco.uf || "",
  ]
    .filter(Boolean)
    .join(" - ");
}

export function ContractForm({
  clients,
  templates,
  clauses,
  hasLetterhead,
}: {
  clients: ClientOption[];
  templates: { id: string; name: string; contract_type: string | null; is_system_default: boolean; previewUrl: string | null }[];
  clauses: { id: string; title: string }[];
  hasLetterhead: boolean;
}) {
  const [state, formAction] = useFormState(createContract, initialState);
  useActionToast(state.needsOrgDocument ? undefined : state);

  const formRef = useRef<HTMLFormElement>(null);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    if (state.needsOrgDocument) setGateOpen(true);
  }, [state]);

  const templatesById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const selectedTemplate = selectedTemplateId ? templatesById.get(selectedTemplateId) ?? null : null;

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const selectedClient = selectedClientId ? clientsById.get(selectedClientId) ?? null : null;
  const [invertParties, setInvertParties] = useState(false);
  const clientRoleLabel = invertParties ? "Contratada" : "Contratante";

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <Field label="Cliente" htmlFor="client_id">
          <select
            id="client_id"
            name="client_id"
            required
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Selecionar —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_razao_social}
              </option>
            ))}
          </select>
        </Field>

        {selectedClient && (
          <label className="flex items-start gap-2.5 rounded-card border border-edge bg-mist px-3.5 py-2.5 text-sm text-ink_text">
            <input
              type="checkbox"
              name="invert_parties"
              checked={invertParties}
              onChange={(e) => setInvertParties(e.target.checked)}
              className="mt-0.5 accent-brand-via"
            />
            <span>
              <span className="font-medium">Inverter partes</span>
              <span className="block text-xs text-muted">
                Cliente vira Contratada e Minha Empresa vira Contratante — só neste contrato, não muda o
                cadastro nem o modelo.
              </span>
            </span>
          </label>
        )}

        {selectedClient && (
          <fieldset key={selectedClient.id} className="flex flex-col gap-3 rounded-card border border-edge p-4">
            <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Dados do cliente — usado como {clientRoleLabel} neste contrato, edite se precisar
            </legend>

            <Field label={selectedClient.tipo_pessoa === "PF" ? "Nome completo" : "Razão social"} htmlFor="cliente_nome">
              <input id="cliente_nome" name="cliente_nome" defaultValue={selectedClient.nome_razao_social} className={inputClass} />
            </Field>

            {selectedClient.tipo_pessoa === "PJ" && (
              <Field label="Nome fantasia" htmlFor="cliente_nome_fantasia">
                <input
                  id="cliente_nome_fantasia"
                  name="cliente_nome_fantasia"
                  defaultValue={selectedClient.nome_fantasia ?? ""}
                  className={inputClass}
                />
              </Field>
            )}

            <Field label={selectedClient.tipo_pessoa === "PF" ? "CPF" : "CNPJ"} htmlFor="cliente_cpf_cnpj">
              <input
                id="cliente_cpf_cnpj"
                name="cliente_cpf_cnpj"
                defaultValue={formatCpfCnpj(selectedClient.cpf_cnpj, selectedClient.tipo_pessoa)}
                className={inputClass}
              />
            </Field>

            {selectedClient.tipo_pessoa === "PF" && (
              <Field label="RG" htmlFor="cliente_rg" hint="Fica em branco no contrato se não houver no cadastro">
                <input id="cliente_rg" name="cliente_rg" defaultValue={selectedClient.rg ?? ""} className={inputClass} />
              </Field>
            )}

            <Field label="Endereço" htmlFor="cliente_endereco">
              <input
                id="cliente_endereco"
                name="cliente_endereco"
                defaultValue={enderecoToText(selectedClient.endereco)}
                className={inputClass}
              />
            </Field>

            {selectedClient.tipo_pessoa === "PJ" && (
              <>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Representante legal</p>
                <Field label="Nome do representante" htmlFor="cliente_representante_nome">
                  <input
                    id="cliente_representante_nome"
                    name="cliente_representante_nome"
                    defaultValue={selectedClient.representante?.full_name ?? ""}
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="CPF do representante" htmlFor="cliente_representante_cpf">
                    <input
                      id="cliente_representante_cpf"
                      name="cliente_representante_cpf"
                      defaultValue={
                        selectedClient.representante ? formatCpfCnpj(selectedClient.representante.cpf, "PF") : ""
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="RG do representante" htmlFor="cliente_representante_rg">
                    <input
                      id="cliente_representante_rg"
                      name="cliente_representante_rg"
                      defaultValue={selectedClient.representante?.rg ?? ""}
                      className={inputClass}
                    />
                  </Field>
                </div>
                {!selectedClient.representante && (
                  <p className="text-xs text-muted">
                    Este cliente não tem representante legal cadastrado — cadastre em Clientes para
                    preencher automaticamente, ou informe manualmente acima.
                  </p>
                )}
              </>
            )}
          </fieldset>
        )}

        <Field label="Modelo de contrato" htmlFor="template_id">
          <div className="flex items-center gap-2">
            <select
              id="template_id"
              name="template_id"
              required
              className={inputClass}
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">— Selecionar —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.contract_type ? ` · ${t.contract_type}` : ""}
                  {t.is_system_default ? " · Modelo do sistema" : ""}
                </option>
              ))}
            </select>
            {selectedTemplate?.previewUrl && (
              <a
                href={selectedTemplate.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 whitespace-nowrap rounded-card border border-edge px-3 py-2.5 text-xs font-medium text-ink_text hover:bg-mist"
              >
                Pré-visualizar
              </a>
            )}
          </div>
          {selectedTemplate?.is_system_default && (
            <p className="mt-1.5 text-xs text-muted">Modelo pronto do sistema, disponível para todos os escritórios.</p>
          )}
        </Field>

        <Field label="Título do contrato" htmlFor="title" hint="Opcional — se não preencher, usa o nome do cliente">
          <input id="title" name="title" className={inputClass} />
        </Field>

        <Field label="Valor acordado" htmlFor="valor" hint="Opcional — em reais, ex.: 1.500,00">
          <input id="valor" name="valor" inputMode="decimal" placeholder="0,00" className={inputClass} />
        </Field>

        <Field
          label="Cláusula personalizada"
          htmlFor="clause_id"
          hint="Opcional — anexada ao final do contrato gerado"
        >
          <select id="clause_id" name="clause_id" className={inputClass}>
            <option value="">— Nenhuma —</option>
            {clauses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>

        {hasLetterhead && (
          <label className="flex items-start gap-2.5 rounded-card border border-edge bg-mist px-3.5 py-2.5 text-sm text-ink_text">
            <input type="checkbox" name="use_letterhead" className="mt-0.5 accent-brand-via" />
            <span>
              <span className="font-medium">Usar papel timbrado</span>
              <span className="block text-xs text-muted">
                Gera o PDF com o cabeçalho e rodapé timbrados cadastrados em Minha Empresa.
              </span>
            </span>
          </label>
        )}

        <SubmitButton pendingLabel="Gerando documento..." className="self-start">
          Gerar contrato
        </SubmitButton>
      </form>

      <div className="rounded-card border border-edge bg-mist px-4 py-3.5 text-xs text-muted">
        <p className="font-medium text-ink_text">Placeholders disponíveis no arquivo .docx</p>
        <p className="mt-1">
          Use <code className="font-mono text-brand-via">{"{chave}"}</code> no corpo do documento — por
          exemplo <code className="font-mono text-brand-via">{"{cliente_nome}"}</code>:
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((key) => (
            <code key={key} className="rounded-md border border-edge bg-card px-1.5 py-0.5 font-mono text-[11px] text-ink_text">
              {`{${key}}`}
            </code>
          ))}
        </div>
      </div>

      <OrgDocumentGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onSaved={() => {
          setGateOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
