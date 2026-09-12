"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchCnpjData, type CnpjLookupResult } from "@/lib/receita-federal/cnpj";
import { fetchCepData, type CepLookupResult } from "@/lib/cep/viacep";
import { isValidCpfCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import {
  parseClientsWorkbook,
  validateClientRow,
  MAX_IMPORT_FILE_BYTES,
} from "@/lib/excel/clients";
import type { ImportResult } from "@/lib/excel/types";
import type { Json } from "@/types/database.types";

interface RepresentativeInput {
  full_name: string;
  cpf: string;
  rg: string | null;
  is_principal: boolean;
}

/** Faz o parse do JSON de representantes legais vindo do formulário de
 *  cliente. Linhas totalmente vazias são ignoradas; se nenhuma vier marcada
 *  como principal, a primeira é promovida (a UI já evita isso, mas o server
 *  action não confia no client). */
function parseRepresentativesInput(
  raw: string
): { ok: true; rows: RepresentativeInput[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, rows: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Dados de representante legal inválidos." };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "Dados de representante legal inválidos." };

  const rows: RepresentativeInput[] = [];
  for (const item of parsed) {
    const record = item as Record<string, unknown>;
    const fullName = String(record?.full_name ?? "").trim();
    const cpf = onlyDigits(String(record?.cpf ?? ""));
    const rg = String(record?.rg ?? "").trim();
    const isPrincipal = Boolean(record?.is_principal);
    if (!fullName && !cpf) continue;
    if (!fullName) return { ok: false, error: "Informe o nome de todos os representantes legais." };
    if (!isValidCpfCnpj(cpf, "PF")) {
      return { ok: false, error: `CPF inválido para o representante "${fullName}".` };
    }
    rows.push({ full_name: fullName, cpf, rg: rg || null, is_principal: isPrincipal });
  }

  if (rows.length > 0 && !rows.some((r) => r.is_principal)) {
    rows[0].is_principal = true;
  }
  return { ok: true, rows };
}

export async function lookupCnpj(
  cnpj: string
): Promise<{ ok: true; data: CnpjLookupResult } | { ok: false; error: string }> {
  if (!isValidCpfCnpj(cnpj, "PJ")) {
    return { ok: false, error: "CNPJ inválido." };
  }

  try {
    const data = await fetchCnpjData(cnpj);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao consultar CNPJ." };
  }
}

export async function lookupCep(
  cep: string
): Promise<{ ok: true; data: CepLookupResult } | { ok: false; error: string }> {
  if (onlyDigits(cep).length !== 8) {
    return { ok: false, error: "CEP inválido." };
  }

  try {
    const data = await fetchCepData(cep);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao consultar CEP." };
  }
}

export async function createClientRecord(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const tipoPessoa = String(formData.get("tipo_pessoa") ?? "") as "PF" | "PJ";
  const cpfCnpj = onlyDigits(String(formData.get("cpf_cnpj") ?? ""));
  const nomeRazaoSocial = String(formData.get("nome_razao_social") ?? "").trim();
  const nomeFantasia = String(formData.get("nome_fantasia") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();

  if (tipoPessoa !== "PF" && tipoPessoa !== "PJ") {
    return { error: "Selecione o tipo de pessoa (PF ou PJ)." };
  }
  if (!isValidCpfCnpj(cpfCnpj, tipoPessoa)) {
    return { error: tipoPessoa === "PF" ? "CPF inválido." : "CNPJ inválido." };
  }
  if (!nomeRazaoSocial) {
    return { error: tipoPessoa === "PF" ? "Nome é obrigatório." : "Razão social é obrigatória." };
  }

  const representativesResult =
    tipoPessoa === "PJ"
      ? parseRepresentativesInput(String(formData.get("representatives") ?? ""))
      : ({ ok: true, rows: [] } as const);
  if (!representativesResult.ok) return { error: representativesResult.error };

  const endereco = {
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? "") || null,
    bairro: String(formData.get("bairro") ?? ""),
    municipio: String(formData.get("municipio") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    cep: String(formData.get("cep") ?? ""),
  };
  const hasEndereco = Object.values(endereco).some((v) => v);

  // Payload bruto da consulta à Receita Federal (se o usuário clicou em
  // "Buscar" no cadastro) — guardamos tudo, não só o marcador, pra ter CNAE
  // e situação cadastral disponíveis depois sem precisar consultar de novo.
  let receitaFederalData: Json | null = null;
  if (tipoPessoa === "PJ") {
    const rawJson = String(formData.get("receita_federal_raw") ?? "");
    if (rawJson) {
      try {
        receitaFederalData = JSON.parse(rawJson) as Json;
      } catch {
        receitaFederalData = { synced_via: "brasilapi" };
      }
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile) return { error: "Perfil do usuário não encontrado." };

  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({
      org_id: profile.org_id,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpfCnpj,
      nome_razao_social: nomeRazaoSocial,
      nome_fantasia: nomeFantasia || null,
      email: email || null,
      telefone: telefone || null,
      rg: tipoPessoa === "PF" ? rg || null : null,
      endereco: hasEndereco ? endereco : null,
      receita_federal_data: receitaFederalData,
      receita_federal_synced_at: receitaFederalData ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !newClient) {
    if (error?.code === "23505") {
      return { error: "Já existe um cliente cadastrado com este CPF/CNPJ." };
    }
    return { error: "Não foi possível salvar o cliente. Tente novamente." };
  }

  if (representativesResult.rows.length > 0) {
    const { error: repError } = await supabase.from("client_representatives").insert(
      representativesResult.rows.map((r) => ({
        org_id: profile.org_id,
        client_id: newClient.id,
        full_name: r.full_name,
        cpf: r.cpf,
        rg: r.rg,
        is_principal: r.is_principal,
        created_by: user.id,
      }))
    );
    if (repError) {
      redirect(
        `/clientes?erro=${encodeURIComponent(`Cliente "${nomeRazaoSocial}" cadastrado, mas houve um problema ao salvar os representantes legais.`)}`
      );
    }
  }

  redirect(`/clientes?sucesso=${encodeURIComponent(`Cliente "${nomeRazaoSocial}" cadastrado.`)}`);
}

export async function updateClientRecord(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const clientId = String(formData.get("client_id") ?? "");
  const tipoPessoa = String(formData.get("tipo_pessoa") ?? "") as "PF" | "PJ";
  const cpfCnpj = onlyDigits(String(formData.get("cpf_cnpj") ?? ""));
  const nomeRazaoSocial = String(formData.get("nome_razao_social") ?? "").trim();
  const nomeFantasia = String(formData.get("nome_fantasia") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();

  if (!clientId) return { error: "Cliente não encontrado." };
  if (tipoPessoa !== "PF" && tipoPessoa !== "PJ") {
    return { error: "Selecione o tipo de pessoa (PF ou PJ)." };
  }
  if (!isValidCpfCnpj(cpfCnpj, tipoPessoa)) {
    return { error: tipoPessoa === "PF" ? "CPF inválido." : "CNPJ inválido." };
  }
  if (!nomeRazaoSocial) {
    return { error: tipoPessoa === "PF" ? "Nome é obrigatório." : "Razão social é obrigatória." };
  }

  const representativesResult =
    tipoPessoa === "PJ"
      ? parseRepresentativesInput(String(formData.get("representatives") ?? ""))
      : ({ ok: true, rows: [] } as const);
  if (!representativesResult.ok) return { error: representativesResult.error };

  const endereco = {
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? "") || null,
    bairro: String(formData.get("bairro") ?? ""),
    municipio: String(formData.get("municipio") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    cep: String(formData.get("cep") ?? ""),
  };
  const hasEndereco = Object.values(endereco).some((v) => v);

  // Só atualiza os dados da Receita Federal se o usuário rodou uma nova
  // consulta nesta edição — não sobrescreve o que já estava salvo à toa.
  let receitaFederalUpdate: { receita_federal_data: Json; receita_federal_synced_at: string } | null = null;
  if (tipoPessoa === "PJ") {
    const rawJson = String(formData.get("receita_federal_raw") ?? "");
    if (rawJson) {
      try {
        receitaFederalUpdate = {
          receita_federal_data: JSON.parse(rawJson) as Json,
          receita_federal_synced_at: new Date().toISOString(),
        };
      } catch {
        // JSON inválido — ignora, mantém o que já estava salvo.
      }
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile) return { error: "Perfil do usuário não encontrado." };

  const { error } = await supabase
    .from("clients")
    .update({
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpfCnpj,
      nome_razao_social: nomeRazaoSocial,
      nome_fantasia: nomeFantasia || null,
      email: email || null,
      telefone: telefone || null,
      rg: tipoPessoa === "PF" ? rg || null : null,
      endereco: hasEndereco ? endereco : null,
      ...receitaFederalUpdate,
    })
    .eq("id", clientId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um cliente cadastrado com este CPF/CNPJ." };
    }
    return { error: "Não foi possível salvar o cliente. Tente novamente." };
  }

  // Sincroniza representantes por substituição total — mais simples que
  // diff, e nada mais referencia essas linhas diretamente (contratos já
  // gerados guardam um snapshot próprio em contracts.party_data).
  await supabase.from("client_representatives").delete().eq("client_id", clientId);
  if (tipoPessoa === "PJ" && representativesResult.rows.length > 0) {
    const { error: repError } = await supabase.from("client_representatives").insert(
      representativesResult.rows.map((r) => ({
        org_id: profile.org_id,
        client_id: clientId,
        full_name: r.full_name,
        cpf: r.cpf,
        rg: r.rg,
        is_principal: r.is_principal,
        created_by: user.id,
      }))
    );
    if (repError) {
      redirect(
        `/clientes?erro=${encodeURIComponent(`Cliente "${nomeRazaoSocial}" atualizado, mas houve um problema ao salvar os representantes legais.`)}`
      );
    }
  }

  revalidatePath("/clientes");
  redirect(`/clientes?sucesso=${encodeURIComponent(`Cliente "${nomeRazaoSocial}" atualizado.`)}`);
}

export async function deleteClientRecord(formData: FormData): Promise<void> {
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) redirect(`/clientes?erro=${encodeURIComponent("Cliente não encontrado.")}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("nome_razao_social")
    .eq("id", clientId)
    .single();

  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    const message =
      error.code === "23503"
        ? "Não é possível excluir: este cliente já tem contratos gerados."
        : "Não foi possível excluir o cliente.";
    redirect(`/clientes?erro=${encodeURIComponent(message)}`);
  }

  revalidatePath("/clientes");
  redirect(`/clientes?sucesso=${encodeURIComponent(`Cliente "${client?.nome_razao_social ?? ""}" excluído.`)}`);
}

export async function toggleClientActive(clientId: string, nextValue: boolean): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("clients").update({ active: nextValue }).eq("id", clientId);
  revalidatePath("/clientes");
}

export async function importClientsFromExcel(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo .xlsx." };
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 5 MB)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile) return { error: "Perfil do usuário não encontrado." };

  let rows;
  try {
    rows = await parseClientsWorkbook(await file.arrayBuffer());
  } catch {
    return { error: "Não foi possível ler a planilha. Verifique se o arquivo é um .xlsx válido." };
  }

  if (rows.length === 0) {
    return { error: "Nenhuma linha reconhecida na planilha. Use o modelo fornecido." };
  }

  let inserted = 0;
  const skipped: { rowNumber: number; reason: string }[] = [];

  for (const row of rows) {
    const validationError = validateClientRow(row);
    if (validationError) {
      skipped.push({ rowNumber: row.rowNumber, reason: validationError });
      continue;
    }

    const endereco = {
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento || null,
      bairro: row.bairro,
      municipio: row.municipio,
      uf: row.uf,
      cep: row.cep,
    };
    const hasEndereco = Object.values(endereco).some((v) => v);

    const { error } = await supabase.from("clients").insert({
      org_id: profile.org_id,
      tipo_pessoa: row.tipo_pessoa as "PF" | "PJ",
      cpf_cnpj: row.cpf_cnpj,
      nome_razao_social: row.nome_razao_social,
      nome_fantasia: row.nome_fantasia || null,
      email: row.email || null,
      telefone: row.telefone || null,
      endereco: hasEndereco ? endereco : null,
      created_by: user.id,
    });

    if (error) {
      skipped.push({
        rowNumber: row.rowNumber,
        reason: error.code === "23505" ? "CPF/CNPJ já cadastrado" : "Falha ao salvar",
      });
      continue;
    }
    inserted++;
  }

  return { inserted, skipped };
}
