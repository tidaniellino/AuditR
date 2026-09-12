"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/validation/cpf-cnpj";
import { mergeDocxTemplate, extractDocxParagraphs } from "@/lib/documents/docx";
import { fillBracketFields } from "@/lib/documents/template-field-fill";
import { analyzeTemplateFields } from "@/lib/documents/template-fields";
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

interface ContratanteOverrides {
  nome?: string;
  documento?: string;
  endereco?: string;
  rg?: string;
  nomeFantasia?: string;
  representanteNome?: string;
  representanteCpf?: string;
  representanteRg?: string;
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
  contratanteOverrides,
  invertParties,
}: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  clientId: string;
  templateId: string;
  titleInput: string;
  valor: number | null;
  clauseId?: string | null;
  contratanteOverrides?: ContratanteOverrides;
  /** Prompt 3: inverte o mapeamento padrão (Cliente=Contratante, Minha
   *  Empresa=Contratada) só para este contrato — não afeta o modelo nem
   *  outros contratos. */
  invertParties?: boolean;
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

  const rawTemplateBuffer = Buffer.from(await templateFile.arrayBuffer());

  const title = titleInput || client.nome_razao_social;
  const endereco = client.endereco as Record<string, string | null> | null;
  const enderecoTexto = endereco
    ? [endereco.logradouro, endereco.numero].filter(Boolean).join(", ") +
      (endereco.bairro ? ` - ${endereco.bairro}` : "") +
      (endereco.municipio ? `, ${endereco.municipio}` : "") +
      (endereco.uf ? `/${endereco.uf}` : "")
    : "";

  const [
    { data: org },
    { data: partners },
    { data: defaultSigner },
    { data: principalRepresentative },
    { data: fieldOccurrences },
    extraClause,
  ] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", profile.org_id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, cpf")
      .eq("org_id", profile.org_id)
      .eq("role", "socio")
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, cpf, oab_crc")
      .eq("org_id", profile.org_id)
      .eq("role", "socio")
      .eq("active", true)
      .eq("is_default_signer", true)
      .maybeSingle(),
    supabase
      .from("client_representatives")
      .select("full_name, cpf, rg")
      .eq("client_id", clientId)
      .order("is_principal", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("template_field_occurrences")
      .select("occurrence_index, role, attribute_key")
      .eq("template_id", templateId)
      .order("occurrence_index", { ascending: true }),
    loadExtraClause(supabase, profile.org_id, clauseId ?? null),
  ]);

  // Resolve os dados finais da Contratante: usa o que o usuário editou na
  // tela de geração (contratanteOverrides), senão cai pro cadastro do
  // cliente — campo sem correspondência fica em branco, não impede a
  // geração, exceto os campos-base checados abaixo.
  const overrides = contratanteOverrides ?? {};
  const resolvedNome = overrides.nome?.trim() || client.nome_razao_social;
  const resolvedDocumento = overrides.documento?.trim() || formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa);
  const resolvedEndereco = overrides.endereco?.trim() || enderecoTexto;
  const resolvedRg = overrides.rg?.trim() || client.rg || "";
  const resolvedNomeFantasia = overrides.nomeFantasia?.trim() || client.nome_fantasia || "";
  const resolvedRepresentanteNome = overrides.representanteNome?.trim() || principalRepresentative?.full_name || "";
  const resolvedRepresentanteCpf =
    overrides.representanteCpf?.trim() ||
    (principalRepresentative ? formatCpfCnpj(principalRepresentative.cpf, "PF") : "");
  const resolvedRepresentanteRg = overrides.representanteRg?.trim() || principalRepresentative?.rg || "";

  const missingContratanteFields: string[] = [];
  if (!resolvedNome) missingContratanteFields.push("nome/razão social");
  if (!resolvedDocumento) missingContratanteFields.push("CPF/CNPJ");
  if (!resolvedEndereco) missingContratanteFields.push("endereço");
  if (missingContratanteFields.length > 0) {
    return {
      error: `Complete o cadastro do cliente antes de gerar o contrato — faltando: ${missingContratanteFields.join(", ")}.`,
    };
  }

  const orgEndereco = org?.endereco as Record<string, string | null> | null;
  const orgEnderecoTexto = orgEndereco
    ? [orgEndereco.logradouro, orgEndereco.numero].filter(Boolean).join(", ") +
      (orgEndereco.bairro ? ` - ${orgEndereco.bairro}` : "") +
      (orgEndereco.municipio ? `, ${orgEndereco.municipio}` : "") +
      (orgEndereco.uf ? `/${orgEndereco.uf}` : "")
    : "";
  const orgCity =
    orgEndereco?.municipio && orgEndereco?.uf ? `${orgEndereco.municipio}/${orgEndereco.uf}` : null;

  const missingContratadaFields: string[] = [];
  if (!org?.cnpj) missingContratadaFields.push("CNPJ");
  if (!orgEnderecoTexto) missingContratadaFields.push("endereço");
  if (missingContratadaFields.length > 0) {
    return {
      error: `Complete o cadastro de "Minha Empresa" antes de gerar o contrato — faltando: ${missingContratadaFields.join(", ")}. Acesse Minha Empresa no menu.`,
    };
  }

  const contractPartners: ContractPartner[] = (partners ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    cpf: p.cpf,
    roleTitle: ROLE_LABELS.socio,
  }));

  // Cliente e Minha Empresa como blocos de dados intercambiáveis — o botão
  // de inverter partes (Prompt 3) só decide qual dos dois cai em qual papel;
  // os {cliente_*}/{escritorio_*} do modelo continuam representando "quem
  // está no papel de Contratante"/"Contratada", não literalmente cliente/org.
  const clientParty = {
    nome: resolvedNome,
    documento: resolvedDocumento,
    endereco: resolvedEndereco,
    email: client.email ?? "",
    telefone: client.telefone ?? "",
    rg: resolvedRg,
    nomeFantasia: resolvedNomeFantasia,
    representanteNome: resolvedRepresentanteNome,
    representanteCpf: resolvedRepresentanteCpf,
    representanteRg: resolvedRepresentanteRg,
  };
  const orgDefaultSignerCpf = defaultSigner?.cpf ? formatCpfCnpj(defaultSigner.cpf, "PF") : "";
  const orgParty = {
    nome: org?.name ?? "",
    documento: org?.cnpj ?? "",
    endereco: orgEnderecoTexto,
    email: org?.email ?? "",
    telefone: org?.telefone ?? "",
    rg: "",
    nomeFantasia: "",
    representanteNome: defaultSigner?.full_name ?? "",
    representanteCpf: orgDefaultSignerCpf,
    representanteRg: "",
  };

  const contratanteParty = invertParties ? orgParty : clientParty;
  const contratadaParty = invertParties ? clientParty : orgParty;

  const mergeData = {
    cliente_nome: contratanteParty.nome,
    cliente_cpf_cnpj: contratanteParty.documento,
    cliente_email: contratanteParty.email,
    cliente_telefone: contratanteParty.telefone,
    cliente_endereco: contratanteParty.endereco,
    cliente_rg: contratanteParty.rg,
    cliente_nome_fantasia: contratanteParty.nomeFantasia,
    cliente_representante_nome: contratanteParty.representanteNome,
    cliente_representante_cpf: contratanteParty.representanteCpf,
    cliente_representante_rg: contratanteParty.representanteRg,
    contrato_titulo: title,
    contrato_tipo: template.contract_type ?? "",
    contrato_valor: valor != null ? formatBRL(valor) : "",
    escritorio_nome: contratadaParty.nome,
    escritorio_cnpj: contratadaParty.documento,
    escritorio_endereco: contratadaParty.endereco,
    escritorio_telefone: contratadaParty.telefone,
    escritorio_email: contratadaParty.email,
    // {socio_nome} é sempre um sócio real de Minha Empresa, independente de
    // qual papel contratual a empresa ocupa neste contrato.
    socio_nome: defaultSigner?.full_name ?? contractPartners[0]?.fullName ?? "",
    data_atual: new Date().toLocaleDateString("pt-BR"),
  };

  // Snapshot final das partes usado neste contrato — não muda
  // retroativamente se o cadastro do cliente ou de Minha Empresa mudar
  // depois, e registra qual papel cada parte ocupou (para consulta futura,
  // sem afetar o modelo nem outros contratos).
  const partyData = {
    invertido: Boolean(invertParties),
    contratante: {
      role: invertParties ? ("organizacao" as const) : ("cliente" as const),
      client_id: clientId,
      org_id: invertParties ? profile.org_id : null,
      nome: contratanteParty.nome,
      documento: contratanteParty.documento,
      endereco: contratanteParty.endereco,
      rg: contratanteParty.rg || null,
      nome_fantasia: contratanteParty.nomeFantasia || null,
      representante_nome: contratanteParty.representanteNome || null,
      representante_cpf: contratanteParty.representanteCpf || null,
      representante_rg: contratanteParty.representanteRg || null,
    },
    contratada: {
      role: invertParties ? ("cliente" as const) : ("organizacao" as const),
      client_id: invertParties ? clientId : null,
      org_id: invertParties ? null : profile.org_id,
      nome: contratadaParty.nome,
      documento: contratadaParty.documento,
      endereco: contratadaParty.endereco,
      signatario_padrao_nome: defaultSigner?.full_name ?? null,
      signatario_padrao_cpf: orgDefaultSignerCpf || null,
      signatarios: contractPartners.map((p) => p.fullName),
    },
  };

  // Resolve os campos "[TEXTO]" classificados na análise do modelo (ver
  // lib/documents/template-fields.ts) para os valores reais de Contratante/
  // Contratada — campo específico do contrato ou sem atributo mapeado fica
  // como estava, para preenchimento manual.
  const partyAttributeValue = (party: typeof contratanteParty, attributeKey: string | null): string | undefined => {
    switch (attributeKey) {
      case "nome":
        return party.nome;
      case "nome_fantasia":
        return party.nomeFantasia;
      case "documento":
        return party.documento;
      case "endereco":
        return party.endereco;
      case "rg":
        return party.rg;
      case "telefone":
        return party.telefone;
      case "email":
        return party.email;
      case "representante_nome":
        return party.representanteNome;
      case "representante_cpf":
        return party.representanteCpf;
      case "representante_rg":
        return party.representanteRg;
      default:
        return undefined;
    }
  };

  // Atributos "de contrato" — não são dado cadastral de nenhuma parte, mas
  // já têm uma fonte disponível na própria geração (valor digitado no
  // formulário, data de hoje, endereço de Minha Empresa, registro
  // profissional do sócio) — resolvidos aqui pra não deixar em branco à toa
  // um campo "específico" que na real já tem de onde vir.
  const MESES_PT_EXTENSO = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const now = new Date();

  function parseCrc(raw: string | null): { uf: string | null; numero: string | null } {
    if (!raw) return { uf: null, numero: null };
    const cleaned = raw.trim();
    let m = cleaned.match(/([A-Za-z]{2})\D*([\d.\-/]+)/);
    if (m) return { uf: m[1].toUpperCase(), numero: m[2].replace(/[^\d.]/g, "") };
    m = cleaned.match(/([\d.\-/]+)\D*([A-Za-z]{2})/);
    if (m) return { uf: m[2].toUpperCase(), numero: m[1].replace(/[^\d.]/g, "") };
    return { uf: null, numero: null };
  }
  const crc = parseCrc(defaultSigner?.oab_crc ?? null);

  const contractAttributeValue = (attributeKey: string | null): string | null => {
    switch (attributeKey) {
      case "contrato_valor":
        return valor != null ? formatBRL(valor) : null;
      case "contrato_valor_sem_simbolo":
        return valor != null ? formatBRL(valor).replace(/^R\$\s*/i, "") : null;
      case "contrato_dia":
        return String(now.getDate());
      case "contrato_mes_extenso":
        return MESES_PT_EXTENSO[now.getMonth()];
      case "contrato_ano":
        return String(now.getFullYear());
      case "contrato_cidade":
        return orgEndereco?.municipio || null;
      case "contrato_estado":
        return orgEndereco?.uf || null;
      case "crc_uf":
        return crc.uf;
      case "crc_numero":
        return crc.numero;
      default:
        return null;
    }
  };
  // Estas chaves resolvem sempre pelo mesmo caminho (data/valor/CRC),
  // mesmo quando a ocorrência caiu dentro do bloco de qualificação de uma
  // parte (ex.: o CRC deste modelo vem logo depois de "CONTRATADA:", então
  // sua ocorrência tem role="contratada", não "especifico").
  const CONTRACT_LEVEL_ATTRIBUTE_KEYS = new Set([
    "contrato_valor",
    "contrato_valor_sem_simbolo",
    "contrato_dia",
    "contrato_mes_extenso",
    "contrato_ano",
    "contrato_cidade",
    "contrato_estado",
    "crc_uf",
    "crc_numero",
  ]);

  // Modelo ainda nunca analisado (ex.: cadastrado antes desta funcionalidade
  // existir, ou o botão "Reanalisar" nunca foi usado) — analisa agora, na
  // hora de gerar, em vez de simplesmente pular o preenchimento em silêncio,
  // e já persiste pra não repetir a análise no próximo contrato.
  let occurrencesForFill = fieldOccurrences ?? [];
  if (occurrencesForFill.length === 0 && !template.fields_analyzed_at) {
    try {
      const freshParagraphs = extractDocxParagraphs(rawTemplateBuffer);
      const freshOccurrences = analyzeTemplateFields(freshParagraphs);
      if (freshOccurrences.length > 0) {
        await supabase.from("template_field_occurrences").insert(
          freshOccurrences.map((o) => ({
            org_id: profile.org_id,
            template_id: templateId,
            occurrence_index: o.occurrenceIndex,
            raw_text: o.rawText,
            paragraph_index: o.paragraphIndex,
            context_snippet: o.contextSnippet,
            role: o.role,
            attribute_key: o.attributeKey,
            confidence: o.confidence,
          }))
        );
      }
      await supabase.from("contract_templates").update({ fields_analyzed_at: new Date().toISOString() }).eq("id", templateId);
      occurrencesForFill = freshOccurrences.map((o) => ({
        occurrence_index: o.occurrenceIndex,
        role: o.role,
        attribute_key: o.attributeKey,
      }));
    } catch {
      // Não foi possível analisar agora (ex.: arquivo corrompido) — segue
      // sem preencher os campos "[...]", como já era o comportamento.
    }
  }

  const bracketValuesByOccurrence = new Map<number, string>();
  for (const occurrence of occurrencesForFill) {
    if (occurrence.attribute_key && CONTRACT_LEVEL_ATTRIBUTE_KEYS.has(occurrence.attribute_key)) {
      const value = contractAttributeValue(occurrence.attribute_key);
      if (value !== null) bracketValuesByOccurrence.set(occurrence.occurrence_index, value);
      continue;
    }
    if (occurrence.role === "especifico") continue;
    const party = occurrence.role === "contratante" ? contratanteParty : contratadaParty;
    const value = partyAttributeValue(party, occurrence.attribute_key);
    if (value !== undefined) bracketValuesByOccurrence.set(occurrence.occurrence_index, value);
  }

  let mergedDocx: Buffer;
  try {
    const withBracketFieldsFilled =
      bracketValuesByOccurrence.size > 0
        ? fillBracketFields(rawTemplateBuffer, bracketValuesByOccurrence)
        : rawTemplateBuffer;
    mergedDocx = mergeDocxTemplate(withBracketFieldsFilled, mergeData);
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
      party_data: partyData,
    })
    .select("id")
    .single();

  if (insertError || !contract) return { error: "Não foi possível criar o contrato." };

  const paragraphs = extractDocxParagraphs(mergedDocx);
  const pdfBytes = await buildContractPdf({
    contractId: contract.id,
    templateName: template.name,
    orgName: org?.name ?? "",
    orgRoleLabel: invertParties ? "Contratante" : "Contratada",
    orgCity,
    contractType: template.contract_type,
    contratanteNome: contratanteParty.nome,
    contratanteDocumento: contratanteParty.documento,
    contratanteEmail: contratanteParty.email || null,
    contratadaNome: contratadaParty.nome,
    contratadaDocumento: contratadaParty.documento,
    contratadaEmail: contratadaParty.email || null,
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
  const orgEnderecoTexto = orgEndereco
    ? [orgEndereco.logradouro, orgEndereco.numero].filter(Boolean).join(", ") +
      (orgEndereco.bairro ? ` - ${orgEndereco.bairro}` : "") +
      (orgEndereco.municipio ? `, ${orgEndereco.municipio}` : "") +
      (orgEndereco.uf ? `/${orgEndereco.uf}` : "")
    : "";

  const missingContratadaFields: string[] = [];
  if (!org?.cnpj) missingContratadaFields.push("CNPJ");
  if (!orgEnderecoTexto) missingContratadaFields.push("endereço");
  if (missingContratadaFields.length > 0) {
    return {
      error: `Complete o cadastro de "Minha Empresa" antes de gerar o contrato — faltando: ${missingContratadaFields.join(", ")}. Acesse Minha Empresa no menu.`,
    };
  }

  const contractPartners: ContractPartner[] = (partners ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    cpf: p.cpf,
    roleTitle: ROLE_LABELS.socio,
  }));

  const mergedDocx = Buffer.from(await file.arrayBuffer());

  const partyData = {
    contratante: {
      role: "cliente" as const,
      client_id: clientId,
      nome: client.nome_razao_social,
      documento: formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa),
      endereco: null,
      rg: client.rg || null,
      nome_fantasia: client.nome_fantasia || null,
      representante_nome: null,
      representante_cpf: null,
      representante_rg: null,
    },
    contratada: {
      role: "organizacao" as const,
      org_id: profile.org_id,
      nome: org?.name ?? "",
      documento: org?.cnpj ?? "",
      endereco: orgEnderecoTexto,
    },
  };

  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      org_id: profile.org_id,
      client_id: clientId,
      template_id: null,
      title,
      created_by: userId,
      party_data: partyData,
    })
    .select("id")
    .single();

  if (insertError || !contract) return { error: "Não foi possível criar o contrato." };

  const paragraphs = extractDocxParagraphs(mergedDocx);
  const pdfBytes = await buildContractPdf({
    contractId: contract.id,
    templateName: "Contrato avulso (upload)",
    orgName: org?.name ?? "",
    orgRoleLabel: "Contratada",
    orgCity,
    contractType: null,
    contratanteNome: client.nome_razao_social,
    contratanteDocumento: formatCpfCnpj(client.cpf_cnpj, client.tipo_pessoa),
    contratanteEmail: client.email,
    contratadaNome: org?.name ?? "",
    contratadaDocumento: org?.cnpj ?? "",
    contratadaEmail: org?.email ?? null,
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

export interface QuickSendResult {
  error?: string;
  success?: string;
}

/** Envio rápido a partir da grade de clientes: o cliente já existe (veio da
 *  linha clicada), então só resta escolher o contrato (modelo ou upload) e
 *  mandar direto para assinatura — reaproveita a mesma pipeline de
 *  geração/envio do fluxo tradicional. */
export async function quickSendContractForClient(
  _prevState: QuickSendResult | undefined,
  formData: FormData
): Promise<QuickSendResult> {
  const { supabase, user, profile } = await requireUser();

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Cliente não encontrado." };

  // Confere explicitamente que o cliente pertence à org do usuário — não
  // depende só do RLS de `clients`, já que client_id chega direto do form.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("org_id", profile.org_id)
    .maybeSingle();
  if (!client) return { error: "Cliente não encontrado." };

  const mode = String(formData.get("mode") ?? "");
  const titleInput = String(formData.get("title") ?? "").trim();

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
  revalidatePath("/clientes");

  return { success: sendResult.success };
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

  // Overrides da tela de revisão da Contratante — só valem para este
  // contrato, nunca alteram o cadastro do cliente (ver ContractForm.tsx).
  const contratanteOverrides: ContratanteOverrides = {
    nome: String(formData.get("cliente_nome") ?? "").trim() || undefined,
    documento: String(formData.get("cliente_cpf_cnpj") ?? "").trim() || undefined,
    endereco: String(formData.get("cliente_endereco") ?? "").trim() || undefined,
    rg: String(formData.get("cliente_rg") ?? "").trim() || undefined,
    nomeFantasia: String(formData.get("cliente_nome_fantasia") ?? "").trim() || undefined,
    representanteNome: String(formData.get("cliente_representante_nome") ?? "").trim() || undefined,
    representanteCpf: String(formData.get("cliente_representante_cpf") ?? "").trim() || undefined,
    representanteRg: String(formData.get("cliente_representante_rg") ?? "").trim() || undefined,
  };

  const invertParties = formData.get("invert_parties") === "on";

  const result = await generateContract({
    supabase,
    userId: user.id,
    profile,
    clientId,
    templateId,
    titleInput,
    valor,
    clauseId,
    contratanteOverrides,
    invertParties,
  });
  if ("error" in result) return result;

  revalidatePath("/contratos");
  redirect(`/contratos/${result.contractId}`);
}
