"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";
import { mergeDocxTemplate, extractDocxParagraphs } from "@/lib/documents/docx";
import { buildContractPdf } from "@/lib/documents/pdf";
import { generateSigningCode, hashSigningCode, SIGNING_CODE_TTL_HOURS } from "@/lib/signing/codes";
import { sendSigningEmail } from "@/lib/email/resend";
import { getBaseUrl } from "@/lib/url";

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

  if (!clientId) return { error: "Selecione o cliente." };
  if (!templateId) return { error: "Selecione o modelo de contrato." };

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

  const title = titleInput || `${template.name} — ${client.nome_razao_social}`;
  const endereco = client.endereco as Record<string, string | null> | null;
  const enderecoTexto = endereco
    ? [endereco.logradouro, endereco.numero].filter(Boolean).join(", ") +
      (endereco.bairro ? ` - ${endereco.bairro}` : "") +
      (endereco.municipio ? `, ${endereco.municipio}` : "") +
      (endereco.uf ? `/${endereco.uf}` : "")
    : "";

  const { data: org } = await supabase.from("organizations").select("name").eq("id", profile.org_id).single();

  const mergeData = {
    cliente_nome: client.nome_razao_social,
    cliente_cpf_cnpj: formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa),
    cliente_email: client.email ?? "",
    cliente_telefone: client.telefone ?? "",
    cliente_endereco: enderecoTexto,
    contrato_titulo: title,
    contrato_tipo: template.contract_type ?? "",
    escritorio_nome: org?.name ?? "",
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

  const paragraphs = extractDocxParagraphs(mergedDocx);
  const pdfBytes = await buildContractPdf({
    title,
    orgName: org?.name ?? "",
    contractType: template.contract_type,
    clientName: client.nome_razao_social,
    clientDocument: formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa),
    clientEmail: client.email,
    bodyParagraphs: paragraphs,
  });

  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      org_id: profile.org_id,
      client_id: clientId,
      template_id: templateId,
      title,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !contract) return { error: "Não foi possível criar o contrato." };

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

  redirect(`/contratos/${contract.id}`);
}

export interface SendResult {
  error?: string;
  success?: string;
}

export async function sendForSignature(
  _prevState: SendResult | undefined,
  formData: FormData
): Promise<SendResult> {
  const { supabase, profile } = await requireUser();
  const contractId = String(formData.get("contract_id") ?? "");
  if (!contractId) return { error: "Contrato não encontrado." };

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

  revalidatePath(`/contratos/${contractId}`);
  revalidatePath("/contratos");
  return { success: `Código enviado para ${client.email}.` };
}
