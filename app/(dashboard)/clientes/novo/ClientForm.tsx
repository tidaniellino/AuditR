"use client";

import { useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { createClientRecord, updateClientRecord, lookupCnpj, lookupCep } from "../actions";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import type { CnpjLookupResult } from "@/lib/receita-federal/cnpj";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useActionToast } from "@/components/ui/Toast";

export interface ClientRepresentative {
  id?: string;
  full_name: string;
  cpf: string;
  rg: string | null;
  is_principal: boolean;
}

export interface ClientRecord {
  id: string;
  tipo_pessoa: "PF" | "PJ";
  cpf_cnpj: string;
  nome_razao_social: string;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  endereco: Record<string, string | null> | null;
  rg: string | null;
  representatives: ClientRepresentative[];
}

export function ClientForm({ client }: { client?: ClientRecord }) {
  const [state, formAction] = useFormState(client ? updateClientRecord : createClientRecord, undefined);
  useActionToast(state);
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">(client?.tipo_pessoa ?? "PJ");
  const [cpfCnpj, setCpfCnpj] = useState(client ? onlyDigits(client.cpf_cnpj) : "");
  const [dadosRf, setDadosRf] = useState<CnpjLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cepError, setCepError] = useState<string | null>(null);
  const [, startCepTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const cepLookedUpRef = useRef<string | null>(null);
  const [representatives, setRepresentatives] = useState<
    { full_name: string; cpf: string; rg: string; is_principal: boolean }[]
  >(
    () =>
      client?.representatives.map((r) => ({
        full_name: r.full_name,
        cpf: onlyDigits(r.cpf),
        rg: r.rg ?? "",
        is_principal: r.is_principal,
      })) ?? []
  );

  function updateRepresentative(index: number, patch: Partial<(typeof representatives)[number]>) {
    setRepresentatives((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRepresentative() {
    setRepresentatives((prev) => [...prev, { full_name: "", cpf: "", rg: "", is_principal: prev.length === 0 }]);
  }

  function removeRepresentative(index: number) {
    setRepresentatives((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((r) => r.is_principal)) next[0] = { ...next[0], is_principal: true };
      return next;
    });
  }

  function setPrincipalRepresentative(index: number) {
    setRepresentatives((prev) => prev.map((r, i) => ({ ...r, is_principal: i === index })));
  }

  function handleCepLookup(rawCep: string) {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8 || cepLookedUpRef.current === cep) return;
    cepLookedUpRef.current = cep;

    setCepStatus("loading");
    setCepError(null);
    startCepTransition(async () => {
      const result = await lookupCep(cep);
      if (!result.ok) {
        setCepStatus("error");
        setCepError(result.error);
        return;
      }
      setCepStatus("idle");

      const form = formRef.current;
      if (!form) return;
      (form.elements.namedItem("logradouro") as HTMLInputElement).value = result.data.logradouro;
      (form.elements.namedItem("bairro") as HTMLInputElement).value = result.data.bairro;
      (form.elements.namedItem("municipio") as HTMLInputElement).value = result.data.municipio;
      (form.elements.namedItem("uf") as HTMLInputElement).value = result.data.uf;
      const complementoField = form.elements.namedItem("complemento") as HTMLInputElement;
      if (result.data.complemento && !complementoField.value) {
        complementoField.value = result.data.complemento;
      }
      // Foco no número, já que é o único dado que o CEP não traz.
      (form.elements.namedItem("numero") as HTMLInputElement)?.focus();
    });
  }

  function handleLookup() {
    setLookupError(null);
    startTransition(async () => {
      const result = await lookupCnpj(cpfCnpj);
      if (!result.ok) {
        setLookupError(result.error);
        setDadosRf(null);
        return;
      }
      setDadosRf(result.data);

      if (formRef.current) {
        const form = formRef.current;
        (form.elements.namedItem("nome_razao_social") as HTMLInputElement).value = result.data.razaoSocial;
        (form.elements.namedItem("nome_fantasia") as HTMLInputElement).value = result.data.nomeFantasia ?? "";
        (form.elements.namedItem("email") as HTMLInputElement).value = result.data.email ?? "";
        (form.elements.namedItem("telefone") as HTMLInputElement).value = result.data.telefone ?? "";
        (form.elements.namedItem("logradouro") as HTMLInputElement).value = result.data.endereco.logradouro;
        (form.elements.namedItem("numero") as HTMLInputElement).value = result.data.endereco.numero;
        (form.elements.namedItem("complemento") as HTMLInputElement).value =
          result.data.endereco.complemento ?? "";
        (form.elements.namedItem("bairro") as HTMLInputElement).value = result.data.endereco.bairro;
        (form.elements.namedItem("municipio") as HTMLInputElement).value = result.data.endereco.municipio;
        (form.elements.namedItem("uf") as HTMLInputElement).value = result.data.endereco.uf;
        const cepDigits = onlyDigits(result.data.endereco.cep);
        (form.elements.namedItem("cep") as HTMLInputElement).value =
          cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : result.data.endereco.cep;
        // Já veio da Receita Federal — não precisa buscar de novo no blur do CEP.
        cepLookedUpRef.current = cepDigits;
      }
    });
  }

  const cpfCnpjValid = cpfCnpj ? isValidCpfCnpj(cpfCnpj, tipoPessoa) : null;

  return (
    <form ref={formRef} action={formAction} className="flex max-w-xl flex-col gap-5">
      {client && <input type="hidden" name="client_id" value={client.id} />}

      <div className="flex gap-5">
        <label className="flex items-center gap-2 text-sm text-ink_text">
          <input
            type="radio"
            name="tipo_pessoa"
            value="PJ"
            checked={tipoPessoa === "PJ"}
            onChange={() => {
              setTipoPessoa("PJ");
              setCpfCnpj("");
              setDadosRf(null);
            }}
            className="accent-brand-via"
          />
          Pessoa Jurídica
        </label>
        <label className="flex items-center gap-2 text-sm text-ink_text">
          <input
            type="radio"
            name="tipo_pessoa"
            value="PF"
            checked={tipoPessoa === "PF"}
            onChange={() => {
              setTipoPessoa("PF");
              setCpfCnpj("");
              setDadosRf(null);
            }}
            className="accent-brand-via"
          />
          Pessoa Física
        </label>
      </div>

      <Field label={tipoPessoa === "PF" ? "CPF" : "CNPJ"} htmlFor="cpf_cnpj">
        <div className="flex gap-2">
          <input
            id="cpf_cnpj"
            name="cpf_cnpj"
            required
            value={formatCpfCnpj(cpfCnpj, tipoPessoa)}
            onChange={(e) => setCpfCnpj(onlyDigits(e.target.value))}
            className={`flex-1 ${inputClass}`}
          />
          {tipoPessoa === "PJ" && (
            <button
              type="button"
              onClick={handleLookup}
              disabled={!cpfCnpjValid || isPending}
              className="whitespace-nowrap rounded-card border border-edge px-3.5 py-2.5 text-sm font-medium text-ink_text hover:bg-mist disabled:opacity-40"
            >
              {isPending ? "Consultando..." : "Buscar na Receita Federal"}
            </button>
          )}
        </div>
        {cpfCnpj && cpfCnpjValid === false && (
          <p className="mt-1 text-xs text-stamp-dim">{tipoPessoa === "PF" ? "CPF" : "CNPJ"} inválido.</p>
        )}
        {lookupError && <p className="mt-1 text-xs text-stamp-dim">{lookupError}</p>}
        {dadosRf && (
          <div className="mt-1 space-y-0.5">
            <p
              className={`text-xs ${
                dadosRf.situacaoCadastral && dadosRf.situacaoCadastral.toUpperCase() !== "ATIVA"
                  ? "font-semibold text-stamp-dim"
                  : "text-seal"
              }`}
            >
              Dados carregados da Receita Federal — situação: {dadosRf.situacaoCadastral || "não informada"}
              {dadosRf.situacaoCadastral && dadosRf.situacaoCadastral.toUpperCase() !== "ATIVA" ? " ⚠" : ""}
            </p>
            {dadosRf.cnaePrincipal && <p className="text-xs text-muted">CNAE principal: {dadosRf.cnaePrincipal}</p>}
          </div>
        )}
        <input type="hidden" name="receita_federal_raw" value={dadosRf ? JSON.stringify(dadosRf.raw) : ""} />
      </Field>

      <Field label={tipoPessoa === "PF" ? "Nome completo" : "Razão social"} htmlFor="nome_razao_social">
        <input
          id="nome_razao_social"
          name="nome_razao_social"
          required
          defaultValue={client?.nome_razao_social}
          className={inputClass}
        />
      </Field>

      {tipoPessoa === "PJ" && (
        <Field label="Nome fantasia" htmlFor="nome_fantasia">
          <input id="nome_fantasia" name="nome_fantasia" defaultValue={client?.nome_fantasia ?? ""} className={inputClass} />
        </Field>
      )}

      {tipoPessoa === "PF" && (
        <Field label="RG" htmlFor="rg" hint="Opcional — usado para preencher contratos automaticamente">
          <input id="rg" name="rg" defaultValue={client?.rg ?? ""} className={inputClass} />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" defaultValue={client?.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Telefone" htmlFor="telefone">
          <input id="telefone" name="telefone" defaultValue={client?.telefone ?? ""} className={inputClass} />
        </Field>
      </div>

      {tipoPessoa === "PJ" && (
        <fieldset className="flex flex-col gap-3 rounded-card border border-edge p-4">
          <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Representantes legais
          </legend>
          <p className="text-xs text-muted">
            Usados para preencher automaticamente o contrato. Marque um como principal — é o usado
            quando há mais de um.
          </p>

          {representatives.length === 0 && (
            <p className="text-xs text-muted">Nenhum representante cadastrado ainda.</p>
          )}

          {representatives.map((rep, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-card border border-edge/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-ink_text">
                  <input
                    type="radio"
                    checked={rep.is_principal}
                    onChange={() => setPrincipalRepresentative(index)}
                    className="accent-brand-via"
                  />
                  Principal
                </label>
                <button
                  type="button"
                  onClick={() => removeRepresentative(index)}
                  className="text-xs text-stamp-dim hover:underline"
                >
                  Remover
                </button>
              </div>
              <input
                placeholder="Nome completo"
                value={rep.full_name}
                onChange={(e) => updateRepresentative(index, { full_name: e.target.value })}
                className={inputClass}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  placeholder="CPF"
                  value={formatCpfCnpj(rep.cpf, "PF")}
                  onChange={(e) => updateRepresentative(index, { cpf: onlyDigits(e.target.value) })}
                  className={inputClass}
                />
                <input
                  placeholder="RG"
                  value={rep.rg}
                  onChange={(e) => updateRepresentative(index, { rg: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRepresentative}
            className="self-start rounded-card border border-edge px-3 py-1.5 text-xs font-medium text-ink_text hover:bg-mist"
          >
            + Adicionar representante
          </button>

          <input type="hidden" name="representatives" value={JSON.stringify(representatives)} />
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-3 rounded-card border border-edge p-4">
        <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Endereço
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            name="logradouro"
            placeholder="Logradouro"
            defaultValue={client?.endereco?.logradouro ?? ""}
            className={`col-span-2 ${inputClass}`}
          />
          <input name="numero" placeholder="Número" defaultValue={client?.endereco?.numero ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            name="complemento"
            placeholder="Complemento"
            defaultValue={client?.endereco?.complemento ?? ""}
            className={inputClass}
          />
          <input name="bairro" placeholder="Bairro" defaultValue={client?.endereco?.bairro ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input
            name="municipio"
            placeholder="Município"
            defaultValue={client?.endereco?.municipio ?? ""}
            className={`col-span-2 ${inputClass}`}
          />
          <input
            name="uf"
            placeholder="UF"
            maxLength={2}
            defaultValue={client?.endereco?.uf ?? ""}
            className={`uppercase ${inputClass}`}
          />
        </div>
        <div className="w-40">
          <input
            name="cep"
            placeholder="CEP"
            maxLength={9}
            defaultValue={client?.endereco?.cep ?? ""}
            className={inputClass}
            onChange={(e) => {
              const digits = onlyDigits(e.target.value);
              e.target.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : digits;
              if (digits.length < 8) cepLookedUpRef.current = null;
              if (digits.length === 8) handleCepLookup(digits);
            }}
            onBlur={(e) => handleCepLookup(e.target.value)}
          />
          {cepStatus === "loading" && <p className="mt-1 text-xs text-muted">Buscando endereço...</p>}
          {cepStatus === "error" && cepError && <p className="mt-1 text-xs text-stamp-dim">{cepError}</p>}
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Salvando..." className="self-start">
        Salvar cliente
      </SubmitButton>
    </form>
  );
}
