"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj, isValidCpfOuCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";
import { mergeDocxTemplate, extractDocxParagraphs } from "@/lib/documents/docx";
import { buildContractPdf, type ContractPartner } from "@/lib/documents/pdf";
import { generateSigningCode, hashSigningCode, SIGNING_CODE_TTL_HOURS } from "@/lib/signing/codes";
import { sendSigningEmail } from "@/lib/email/resend";
import { isWhatsAppConfigured, sendSigningWhatsAppMessage } from "@/lib/whatsapp/business";
import { getBaseUrl } from "@/lib/url";
import { formatBRL } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { getContractUsage } from "@/lib/billing/limits";
import { isAllowedTemplateFile, MAX_TEMPLATE_FILE_BYTES } from "@/lib/storage/templates";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type Profile = { org_id: string; full_name: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id, full_name").eq("id", user.id).single();
  if (!profile) throw new Error("Perfil não encontrado");
  return { supabase, user, profile };
}

function isDocxFile(fileName: string | null): boolean {
  return !!fileName && fileName.toLowerCase().endsWith(".docx");
}

async function loadExtraClause(
  supabase: SupabaseClient,
  orgId: string,
  clauseId: string | null
): Promise<{ title: string; content: string } | null> {
  if (!clauseId) return null;

  const { data: clause } = await supabase
    .from("clauses")
    .select("title, current_version_id")
    .eq("id", clauseId)
    .eq("org_id", orgId)
    .single();
  if (!clause?.current_version_id) return null;

  const { data: version } = await supabase
    .from("clause_versions")
    .select("content")
    .eq("id", clause.current_version_id)
    .single();
  if (!version?.content) return null;

  return { title: clause.title, content: version.content };
}

async function generateContract({
  supabase,
  userId,
  profile,
  clientId,
  templateId,
  titleInput,
  valor,
  clauseId,
}: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  clientId: string;
  templateId: string;
  titleInput: string;
  valor: number | null;
  clauseId?: string | null;
}): Promise<{ contractId: string } | { error: string }> {
  const usage = await getContractUsage(supabase, profile.org_id);
  if (usage.blocked) {
    return {
      error: usage.isPaidActive
        ? `Limite de ${usage.limit} contratos do plano ${usage.planLabel} atingido neste ciclo. Acesse "Assinatura" no menu para fazer upgrade.`
        : `Limite de ${usage.limit} contratos do plano gratuito atingido. Acesse "Assinatura" no menu para continuar gerando contratos.`,
    };
  }

  const [{ data: client }, { data: template }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("contract_templates").select("*").eq("id", templateId).single(),
  ]);

  if (!client) return { error: "Cliente não encontrado." };
  if (!template) return { error: "Modelo não encontrado." };
  if (!isDocxFile(template.source_file_name)) {
    return {
      error:
        "Este modelo não tem um arquivo .docx anexado. Para gerar contratos automaticamente, edite o modelo e envie um arquivo .docx (com {chave} nos trechos que devem ser preenchidos).",
    };
  }

  const { data: templateFile, error: downloadError } = await supabase.storage
    .from("contract-templates")
    .download(template.source_file_path!);

  if (downloadError || !templateFile) {
    return { error: "Não foi possível ler o arquivo do modelo. Tente novamente." };
  }

  const title = titleInput || client.nome_razao_social;
  const endereco = client.endereco as Record<string, string | null> | null;
  const enderecoTexto = endereco
    ? [endereco.logradouro, endereco.numero].filter(Boolean).join(", ") +
      (endereco.bairro ? ` - ${endereco.bairro}` : "") +
      (endereco.municipio ? `, ${endereco.municipio}` : "") +
      (endereco.uf ? `/${endereco.uf}` : "")
    : "";

  const [{ data: org }, { data: partners }, extraClause] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", profile.org_id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, cpf")
      .eq("org_id", profile.org_id)
      .eq("role", "socio")
      .eq("active", true)
      .order("created_at", { ascending: true }),
    loadExtraClause(supabase, profile.org_id, clauseId ?? null),
  ]);

  const orgEndereco = org?.endereco as Record<string, string | null> | null;
  const orgEnderecoTexto = orgEndereco
    ? [orgEndereco.logradouro, orgEndereco.numero].filter(Boolean).join(", ") +
      (orgEndereco.bairro ? ` - ${orgEndereco.bairro}` : "") +
      (orgEndereco.municipio ? `, ${orgEndereco.municipio}` : "") +
      (orgEndereco.uf ? `/${orgEndereco.uf}` : "")
    : "";
  const orgCity =
    orgEndereco?.municipio && orgEndereco?.uf ? `${orgEndereco.municipio}/${orgEndereco.uf}` : null;
  const contractPartners: ContractPartner[] = (partners ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    cpf: p.cpf,
    roleTitle: ROLE_LABELS.socio,
  }));

  const mergeData = {
    cliente_nome: client.nome_razao_social,
    cliente_cpf_cnpj: formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa),
    cliente_email: client.email ?? "",
    cliente_telefone: client.telefone ?? "",
    cliente_endereco: enderecoTexto,
    contrato_titulo: title,
    contrato_tipo: template.contract_type ?? "",
    contrato_valor: valor != null ? formatBRL(valor) : "",
    escritorio_nome: org?.name ?? "",
    escritorio_cnpj: org?.cnpj ?? "",
    escritorio_endereco: orgEnderecoTexto,
    escritorio_telefone: org?.telefone ?? "",
    escritorio_email: org?.email ?? "",
    socio_nome: contractPartners[0]?.fullName ?? "",
    data_atual: new Date().toLocaleDateString("pt-BR"),
  };

  let mergedDocx: Buffer;
  try {
    mergedDocx = mergeDocxTemplate(await templateFile.arrayBuffer(), mergeData);
  } catch {
    return {
      error: "Não foi possível mesclar o arquivo-modelo. Verifique se os placeholders estão no formato {chave}.",
    };
  }

  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      org_id: profile.org_id,
      client_id: clientId,
      template_id: templateId,
      title,
      valor,
      created_by: userId,
    })
    .select("id")
    .single();

  if (insertError || !contract) return { error: "Não foi possível criar o contrato." };

  const paragraphs = extractDocxParagraphs(mergedDocx);
  const pdfBytes = await buildContractPdf({
    contractId: contract.id,
    templateName: template.name,
    orgName: org?.name ?? "",
    orgCity,
    contractType: template.contract_type,
    clientName: client.nome_razao_social,
    clientDocument: formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa),
    clientEmail: client.email,
    bodyParagraphs: paragraphs,
    extraClause,
    partners: contractPartners,
  });

  const basePath = `${profile.org_id}/${contract.id}`;
  const [docxUpload, pdfUpload] = await Promise.all([
    supabase.storage
      .from("contract-documents")
      .upload(`${basePath}/contrato.docx`, mergedDocx, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      }),
    supabase.storage
      .from("contract-documents")
      .upload(`${basePath}/contrato.pdf`, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true }),
  ]);

  if (docxUpload.error || pdfUpload.error) {
    await supabase.from("contracts").delete().eq("id", contract.id);
    return { error: "Não foi possível salvar os arquivos gerados. Tente novamente." };
  }

  await supabase
    .from("contracts")
    .update({
      generated_docx_path: `${basePath}/contrato.docx`,
      generated_pdf_path: `${basePath}/contrato.pdf`,
    })
    .eq("id", contract.id);

  return { contractId: contract.id };
}

/** Mesma pipeline de generateContract (extrai texto -> monta PDF -> sobe pro
 *  Storage -> cria o contrato), mas para um .docx que o usuário já trouxe
 *  pronto — sem mesclar {placeholders}, sem modelo vinculado. Usado pelo
 *  Envio Rápido no modo "upload de contrato pronto". */
async function generateContractFromUpload({
  supabase,
  userId,
  profile,
  clientId,
  titleInput,
  file,
}: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  clientId: string;
  titleInput: string;
  file: File;
}): Promise<{ contractId: string } | { error: string }> {
  const usage = await getContractUsage(supabase, profile.org_id);
  if (usage.blocked) {
    return {
      error: usage.isPaidActive
        ? `Limite de ${usage.limit} contratos do plano ${usage.planLabel} atingido neste ciclo. Acesse "Assinatura" no menu para fazer upgrade.`
        : `Limite de ${usage.limit} contratos do plano gratuito atingido. Acesse "Assinatura" no menu para continuar gerando contratos.`,
    };
  }

  if (!isAllowedTemplateFile(file)) {
    return { error: "Envie um arquivo .docx." };
  }
  if (file.size > MAX_TEMPLATE_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 10 MB)." };
  }

  const [{ data: client }, { data: org }, { data: partners }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("organizations").select("*").eq("id", profile.org_id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, cpf")
      .eq("org_id", profile.org_id)
      .eq("role", "socio")
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);

  if (!client) return { error: "Cliente não encontrado." };

  const title = titleInput || client.nome_razao_social;
  const orgEndereco = org?.endereco as Record<string, string | null> | null;
  const orgCity = orgEndereco?.municipio && orgEndereco?.uf ? `${orgEndereco.municipio}/${orgEndereco.uf}` : null;
  const contractPartners: ContractPartner[] = (partners ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    cpf: p.cpf,
    roleTitle: ROLE_LABELS.socio,
  }));

  const mergedDocx = Buffer.from(await file.arrayBuffer());

  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      org_id: profile.org_id,
      client_id: clientId,
      template_id: null,
      title,
      created_by: userId,
    })
    .select("id")
    .single();

  if (insertError || !contract) return { error: "Não foi possível criar o contrato." };

  const paragraphs = extractDocxParagraphs(mergedDocx);
  const pdfBytes = await buildContractPdf({
    contractId: contract.id,
    templateName: "Contrato avulso (upload)",
    orgName: org?.name ?? "",
    orgCity,
    contractType: null,
    clientName: client.nome_razao_social,
    clientDocument: formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa),
    clientEmail: client.email,
    bodyParagraphs: paragraphs,
    partners: contractPartners,
  });

  const basePath = `${profile.org_id}/${contract.id}`;
  const [docxUpload, pdfUpload] = await Promise.all([
    supabase.storage
      .from("contract-documents")
      .upload(`${basePath}/contrato.docx`, mergedDocx, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      }),
    supabase.storage
      .from("contract-documents")
      .upload(`${basePath}/contrato.pdf`, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true }),
  ]);

  if (docxUpload.error || pdfUpload.error) {
    await supabase.from("contracts").delete().eq("id", contract.id);
    return { error: "Não foi possível salvar os arquivos gerados. Tente novamente." };
  }

  await supabase
    .from("contracts")
    .update({
      generated_docx_path: `${basePath}/contrato.docx`,
      generated_pdf_path: `${basePath}/contrato.pdf`,
    })
    .eq("id", contract.id);

  return { contractId: contract.id };
}

/** Acha um cliente já cadastrado com esse CPF/CNPJ na organização, ou cria um
 *  novo mínimo (nome, e-mail, WhatsApp, CPF/CNPJ) — usado pelo Envio Rápido,
 *  que não exige que o cliente já esteja cadastrado. */
async function findOrCreateClientByDocument({
  supabase,
  orgId,
  userId,
  cpfCnpj,
  nome,
  email,
  telefone,
}: {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
  cpfCnpj: string;
  nome: string;
  email: string;
  telefone: string;
}): Promise<{ clientId: string; isNewClient: boolean } | { error: string }> {
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("org_id", orgId)
    .eq("cpf_cnpj", cpfCnpj)
    .maybeSingle();

  if (existing) return { clientId: existing.id, isNewClient: false };

  const tipoPessoa = cpfCnpj.length === 11 ? "PF" : "PJ";
  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      org_id: orgId,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpfCnpj,
      nome_razao_social: nome,
      email: email || null,
      telefone: telefone || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !created) return { error: "Não foi possível registrar o cliente." };
  return { clientId: created.id, isNewClient: true };
}

export interface QuickSendResult {
  error?: string;
  success?: string;
  isNewClient?: boolean;
  clientId?: string;
}

export async function quickSendContract(
  _prevState: QuickSendResult | undefined,
  formData: FormData
): Promise<QuickSendResult> {
  const { supabase, user, profile } = await requireUser();

  const mode = String(formData.get("mode") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const cpfCnpj = onlyDigits(String(formData.get("cpf_cnpj") ?? ""));
  const titleInput = String(formData.get("title") ?? "").trim();

  if (!nome) return { error: "Informe o nome do contratante." };
  if (!email) return { error: "Informe o e-mail do contratante." };
  if (!isValidCpfOuCnpj(cpfCnpj)) return { error: "Informe um CPF ou CNPJ válido." };

  const clientResult = await findOrCreateClientByDocument({
    supabase,
    orgId: profile.org_id,
    userId: user.id,
    cpfCnpj,
    nome,
    email,
    telefone,
  });
  if ("error" in clientResult) return clientResult;
  const { clientId, isNewClient } = clientResult;

  let genResult: { contractId: string } | { error: string };

  if (mode === "upload") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Envie o arquivo do contrato (.docx)." };
    }
    genResult = await generateContractFromUpload({
      supabase,
      userId: user.id,
      profile,
      clientId,
      titleInput,
      file,
    });
  } else {
    const templateId = String(formData.get("template_id") ?? "");
    if (!templateId) return { error: "Selecione o modelo de contrato." };

    const clauseId = String(formData.get("clause_id") ?? "").trim() || null;
    const valorRaw = String(formData.get("valor") ?? "").trim();
    let valor: number | null = null;
    if (valorRaw) {
      valor = Number(valorRaw.replace(/\./g, "").replace(",", "."));
      if (Number.isNaN(valor) || valor < 0) return { error: "Valor acordado inválido." };
    }

    genResult = await generateContract({
      supabase,
      userId: user.id,
      profile,
      clientId,
      templateId,
      titleInput,
      valor,
      clauseId,
    });
  }

  if ("error" in genResult) return genResult;

  const sendResult = await sendSignatureCodeById(supabase, profile, genResult.contractId);
  if (sendResult.error) return { error: sendResult.error };

  revalidatePath("/contratos");

  return {
    success: sendResult.success,
    isNewClient,
    clientId: isNewClient ? clientId : undefined,
  };
}

export interface SendResult {
  error?: string;
  success?: string;
}

async function sendSignatureCodeById(
  supabase: SupabaseClient,
  profile: Profile,
  contractId: string
): Promise<SendResult> {
  const { data: contract } = await supabase.from("contracts").select("*").eq("id", contractId).single();
  if (!contract) return { error: "Contrato não encontrado." };
  if (contract.status === "assinado") return { error: "Este contrato já foi assinado." };
  if (contract.status === "arquivado") return { error: "Este contrato está arquivado." };
  if (!contract.generated_pdf_path) return { error: "O documento do contrato ainda não foi gerado." };

  const { data: client } = await supabase.from("clients").select("*").eq("id", contract.client_id).single();
  if (!client) return { error: "Cliente não encontrado." };
  if (!client.email) {
    return { error: "Este cliente não possui e-mail cadastrado. Adicione um e-mail antes de enviar para assinatura." };
  }

  if (contract.status === "rascunho") {
    await supabase.from("contracts").update({ status: "em_revisao" }).eq("id", contractId);
    await supabase.from("contracts").update({ status: "aguardando_assinatura" }).eq("id", contractId);
  } else if (contract.status === "em_revisao") {
    await supabase.from("contracts").update({ status: "aguardando_assinatura" }).eq("id", contractId);
  }

  const code = generateSigningCode();
  const expiresAt = new Date(Date.now() + SIGNING_CODE_TTL_HOURS * 60 * 60 * 1000);

  const { error: codeError } = await supabase.from("signature_codes").insert({
    org_id: profile.org_id,
    contract_id: contractId,
    code_hash: hashSigningCode(code),
    signer_email: client.email,
    signer_name: client.nome_razao_social,
    expires_at: expiresAt.toISOString(),
  });

  if (codeError) return { error: "Não foi possível gerar o código de assinatura." };

  const baseUrl = await getBaseUrl();
  try {
    await sendSigningEmail({
      to: client.email,
      clientName: client.nome_razao_social,
      contractTitle: contract.title,
      code,
      signUrl: `${baseUrl}/assinar/${contractId}`,
    });
  } catch {
    return { error: "Código gerado, mas não foi possível enviar o e-mail. Tente reenviar em instantes." };
  }

  let whatsappSent = false;
  let whatsappWarning: string | null = null;
  if (client.telefone && isWhatsAppConfigured()) {
    try {
      await sendSigningWhatsAppMessage({
        to: client.telefone,
        clientName: client.nome_razao_social,
        contractTitle: contract.title,
        code,
        contractId,
      });
      whatsappSent = true;
    } catch (err) {
      whatsappWarning = err instanceof Error ? err.message : "Falha ao enviar por WhatsApp.";
    }
  }

  revalidatePath(`/contratos/${contractId}`);
  revalidatePath("/contratos");

  const success = whatsappSent
    ? `Código enviado para ${client.email} e por WhatsApp (${client.telefone}).`
    : `Código enviado para ${client.email}.`;

  return whatsappWarning ? { success: `${success} Não foi possível enviar por WhatsApp: ${whatsappWarning}` } : { success };
}

export async function sendForSignature(
  _prevState: SendResult | undefined,
  formData: FormData
): Promise<SendResult> {
  const { supabase, profile } = await requireUser();
  const contractId = String(formData.get("contract_id") ?? "");
  if (!contractId) return { error: "Contrato não encontrado." };

  return sendSignatureCodeById(supabase, profile, contractId);
}

export interface ContractFormState {
  error?: string;
}

export async function createContract(
  _prevState: ContractFormState | undefined,
  formData: FormData
): Promise<ContractFormState> {
  const { supabase, user, profile } = await requireUser();

  const clientId = String(formData.get("client_id") ?? "");
  const templateId = String(formData.get("template_id") ?? "");
  const titleInput = String(formData.get("title") ?? "").trim();
  const valorRaw = String(formData.get("valor") ?? "").trim();
  const clauseId = String(formData.get("clause_id") ?? "").trim() || null;

  if (!clientId) return { error: "Selecione o cliente." };
  if (!templateId) return { error: "Selecione o modelo de contrato." };

  let valor: number | null = null;
  if (valorRaw) {
    valor = Number(valorRaw.replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(valor) || valor < 0) return { error: "Valor acordado inválido." };
  }

  const result = await generateContract({
    supabase,
    userId: user.id,
    profile,
    clientId,
    templateId,
    titleInput,
    valor,
    clauseId,
  });
  if ("error" in result) return result;

  revalidatePath("/contratos");
  redirect(`/contratos/${result.contractId}`);
}
