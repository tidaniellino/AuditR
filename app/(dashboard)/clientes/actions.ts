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

  if (tipoPessoa !== "PF" && tipoPessoa !== "PJ") {
    return { error: "Selecione o tipo de pessoa (PF ou PJ)." };
  }
  if (!isValidCpfCnpj(cpfCnpj, tipoPessoa)) {
    return { error: tipoPessoa === "PF" ? "CPF inválido." : "CNPJ inválido." };
  }
  if (!nomeRazaoSocial) {
    return { error: tipoPessoa === "PF" ? "Nome é obrigatório." : "Razão social é obrigatória." };
  }

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile) return { error: "Perfil do usuário não encontrado." };

  const { error } = await supabase.from("clients").insert({
    org_id: profile.org_id,
    tipo_pessoa: tipoPessoa,
    cpf_cnpj: cpfCnpj,
    nome_razao_social: nomeRazaoSocial,
    nome_fantasia: nomeFantasia || null,
    email: email || null,
    telefone: telefone || null,
    endereco: hasEndereco ? endereco : null,
    receita_federal_data: tipoPessoa === "PJ" && hasEndereco ? { synced_via: "brasilapi" } : null,
    receita_federal_synced_at: tipoPessoa === "PJ" && hasEndereco ? new Date().toISOString() : null,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um cliente cadastrado com este CPF/CNPJ." };
    }
    return { error: "Não foi possível salvar o cliente. Tente novamente." };
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("clients")
    .update({
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpfCnpj,
      nome_razao_social: nomeRazaoSocial,
      nome_fantasia: nomeFantasia || null,
      email: email || null,
      telefone: telefone || null,
      endereco: hasEndereco ? endereco : null,
    })
    .eq("id", clientId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um cliente cadastrado com este CPF/CNPJ." };
    }
    return { error: "Não foi possível salvar o cliente. Tente novamente." };
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
