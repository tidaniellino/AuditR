// Edge Function pública (verify_jwt=false): usada pela página de assinatura,
// onde o cliente que assina NÃO está autenticado no sistema. Roda com a
// service_role key (injetada automaticamente pelo runtime) para poder ler e
// escrever além do RLS — o código de 6 dígitos (hash) é o único mecanismo de
// autenticação aqui, então toda ação sensível exige o código correto.
//
// Arquivo único de propósito: o painel do Supabase (deploy manual) só aceita
// um arquivo por função. As funções puras ficam no topo, exportadas, para
// dar pra reaproveitar em testes locais (`deno test`) caso alguém rode via
// CLI depois — mas o Deno.serve() no fim do arquivo é o que efetivamente
// roda em produção.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Secret separado dos da Vercel/Next.js — precisa ser configurado também
// nos "Edge Function Secrets" do painel do Supabase (Settings > Edge Functions).
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") ?? "AuditR <onboarding@resend.dev>";

const MAX_ATTEMPTS = 5;

// E-mail de confirmação com o PDF assinado em anexo — best-effort: se o
// Resend falhar, a assinatura já está registrada e válida de qualquer jeito,
// então só logamos o erro em vez de derrubar a resposta de sucesso.
async function sendSignedConfirmationEmail(params: {
  to: string;
  signerName: string;
  contractTitle: string;
  documentHash: string;
  pdfBytes: Uint8Array;
}): Promise<void> {
  if (!resendApiKey) {
    console.error("RESEND_API_KEY não configurada nos secrets da Edge Function — e-mail de confirmação não enviado.");
    return;
  }

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #1C1D22;">
      <p>Olá, <strong>${params.signerName}</strong>!</p>
      <p>Sua assinatura eletrônica do documento <strong>${params.contractTitle}</strong> foi registrada com sucesso.</p>
      <p>Em anexo está a cópia em PDF do contrato já assinado, com a página de certificação da assinatura.</p>
      <p style="color:#6B6A63; font-size: 12px; word-break: break-all;">Hash SHA-256 do documento original: ${params.documentHash}</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: params.to,
        subject: `Assinatura confirmada: ${params.contractTitle}`,
        html,
        attachments: [
          {
            filename: "contrato-assinado.pdf",
            content: encodeBase64(params.pdfBytes),
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("Falha ao enviar e-mail de confirmação:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Erro ao chamar a API do Resend:", err);
  }
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante — evita vazar, pelo tempo de resposta, em
 *  qual posição o hex do código informado diverge do hash esperado. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpfCnpj(value: string | null): string {
  if (!value) return "—";
  const d = onlyDigits(value);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value;
}

export function formatWhatsApp(value: string | null): string {
  if (!value) return "—";
  const d = onlyDigits(value);
  if (!d) return "—";
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

// Geolocalização por IP é só enriquecimento do certificado — nunca pode
// bloquear a assinatura. Best-effort com timeout curto; falha silenciosa.
export async function lookupGeolocation(ip: string | null): Promise<string | null> {
  if (!ip || ip === "127.0.0.1" || ip.startsWith("::1") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    const parts = [data.city, data.region, data.country_code].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

function drawLabelValue(
  page: PDFPage,
  y: number,
  label: string,
  value: string,
  fonts: { regular: PDFFont; bold: PDFFont },
  margin: number,
  labelWidth: number
): void {
  page.drawText(label, { x: margin, y, size: 9.5, font: fonts.bold, color: rgb(0.15, 0.15, 0.17) });
  page.drawText(value, {
    x: margin + labelWidth,
    y,
    size: 9.5,
    font: fonts.regular,
    color: rgb(0.15, 0.15, 0.17),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  let body: { action?: string; contract_id?: string; code?: string; ip?: string | null; userAgent?: string | null };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
  }

  const { action, contract_id, code, ip, userAgent } = body;
  if (!contract_id) {
    return new Response(JSON.stringify({ error: "missing_contract_id" }), { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, status, org_id, client_id, generated_pdf_path, signed_document_url, party_data")
    .eq("id", contract_id)
    .single();

  if (!contract) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, cnpj")
    .eq("id", contract.org_id)
    .single();

  if (action === "info") {
    const { data: activeCode } = await supabase
      .from("signature_codes")
      .select("id, expires_at, used_at, signer_name")
      .eq("contract_id", contract_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasValidCode = !!activeCode && !activeCode.used_at && new Date(activeCode.expires_at) > new Date();

    // Link pra conferência antes de assinar (documento original) ou pra
    // baixar de novo depois de assinado (documento já com o certificado).
    const downloadPath = contract.status === "assinado" ? contract.signed_document_url : contract.generated_pdf_path;
    let pdfUrl: string | null = null;
    if (downloadPath) {
      const { data: signed } = await supabase.storage
        .from("contract-documents")
        .createSignedUrl(downloadPath, 60 * 10);
      pdfUrl = signed?.signedUrl ?? null;
    }

    return new Response(
      JSON.stringify({
        title: contract.title,
        orgName: org?.name ?? "",
        status: contract.status,
        signerName: activeCode?.signer_name ?? null,
        hasValidCode,
        codeExpired: !!activeCode && !activeCode.used_at && new Date(activeCode.expires_at) <= new Date(),
        pdfUrl,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (action === "verify") {
    if (!code || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "invalid_code_format" }), { status: 400 });
    }

    if (contract.status !== "aguardando_assinatura") {
      return new Response(JSON.stringify({ error: "contract_not_awaiting_signature" }), { status: 409 });
    }

    const { data: signatureCode } = await supabase
      .from("signature_codes")
      .select("*")
      .eq("contract_id", contract_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!signatureCode) {
      return new Response(JSON.stringify({ error: "no_code" }), { status: 404 });
    }
    if (signatureCode.used_at) {
      return new Response(JSON.stringify({ error: "already_used" }), { status: 409 });
    }
    if (new Date(signatureCode.expires_at) <= new Date()) {
      return new Response(JSON.stringify({ error: "expired" }), { status: 410 });
    }
    // Reserva a tentativa de forma atômica (um único UPDATE condicional no
    // banco) em vez de checar attempts e só depois incrementar em passos
    // separados — evita que requisições concorrentes leiam o mesmo contador
    // e testem vários códigos em paralelo "de graça" (ver migration
    // atomic_signature_attempt_reservation).
    const { data: reserveRows, error: reserveError } = await supabase.rpc("reserve_signature_attempt", {
      p_signature_code_id: signatureCode.id,
      p_max_attempts: MAX_ATTEMPTS,
    });
    const reserved = reserveRows?.[0];

    if (reserveError || !reserved) {
      return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
    }
    if (!reserved.allowed) {
      return new Response(JSON.stringify({ error: "too_many_attempts" }), { status: 429 });
    }

    const incomingHash = await sha256Hex(code);
    if (!timingSafeEqualHex(incomingHash, reserved.code_hash)) {
      return new Response(JSON.stringify({ error: "wrong_code" }), { status: 401 });
    }

    if (!contract.generated_pdf_path) {
      return new Response(JSON.stringify({ error: "missing_document" }), { status: 500 });
    }

    const { data: originalFile, error: downloadError } = await supabase.storage
      .from("contract-documents")
      .download(contract.generated_pdf_path);

    if (downloadError || !originalFile) {
      return new Response(JSON.stringify({ error: "document_download_failed" }), { status: 500 });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("nome_razao_social, cpf_cnpj, tipo_pessoa, telefone")
      .eq("id", contract.client_id)
      .single();

    const signedAt = new Date();
    const originalBytes = await originalFile.arrayBuffer();
    // Hash do conteúdo original (antes de anexar a página de certificação) —
    // é isso que comprova que o documento assinado é o que foi enviado.
    const documentHash = await sha256Hex(new Uint8Array(originalBytes));

    const geolocation = await lookupGeolocation(ip ?? null);

    // Rótulo do documento pelo tipo REAL de cada parte (PF -> CPF, PJ ->
    // CNPJ), não fixo por posição — cliente já tem tipo_pessoa no cadastro;
    // pra Minha Empresa (organizations não tem essa coluna) infere pela
    // quantidade de dígitos do CNPJ, mesma convenção usada no resto do app.
    const clientDocLabel = client?.tipo_pessoa === "PF" ? "CPF" : "CNPJ";
    const orgCnpjDigits = onlyDigits(org?.cnpj ?? "");
    const orgDocLabel = orgCnpjDigits.length === 11 ? "CPF" : "CNPJ";

    // Papel de cada parte NESTE contrato — respeita o botão de inverter
    // partes (contracts.party_data); contratos gerados antes desse campo
    // existir caem no padrão original (cliente = Contratante).
    const partyData = (contract.party_data ?? null) as { contratante?: { role?: string } } | null;
    const clientIsContratante = partyData?.contratante?.role !== "organizacao";
    const clientRoleLabel = clientIsContratante ? "Contratante" : "Contratada";
    const orgRoleLabel = clientIsContratante ? "Contratada" : "Contratante";

    // Código curto de verificação da assinatura do cliente — mesmo
    // mecanismo (hash determinístico) já usado pros sócios em
    // lib/documents/pdf.ts (partnerSignatureCode), pra ficar no mesmo
    // padrão visual.
    const clientSignatureCode = (await sha256Hex(`${contract_id}:${signatureCode.id}`)).slice(0, 12).toUpperCase();

    const pdfDoc = await PDFDocument.load(originalBytes);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fonts = { regular, bold };

    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    const margin = 56;
    // Alguns rótulos novos são mais longos que os originais ("CNPJ:") — ex.:
    // "Contratante (Minha Empresa):" — por isso mais largo que antes.
    const labelWidth = 210;
    let y = height - margin;

    // Bloco "ASSINATURAS" no mesmo formato visual usado pros sócios no
    // documento gerado (ver lib/documents/pdf.ts) — antes só a Minha
    // Empresa aparecia nesse formato; a confirmação do cliente ficava numa
    // página com layout totalmente diferente, sem ligação visual com a
    // "assinatura" dos sócios.
    const timestampBR = signedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " BRT";
    page.drawText("ASSINATURAS", { x: margin, y, size: 11, font: bold, color: rgb(0.07, 0.23, 0.37) });
    y -= 24;
    page.drawText(timestampBR, { x: margin, y, size: 9, font: regular, color: rgb(0.42, 0.41, 0.39) });
    y -= 14;
    page.drawText(signatureCode.signer_name, { x: margin, y, size: 11, font: bold, color: rgb(0.11, 0.11, 0.13) });
    y -= 15;
    page.drawText("_______________________________________", {
      x: margin,
      y,
      size: 10.5,
      font: regular,
      color: rgb(0.11, 0.11, 0.13),
    });
    y -= 13;
    page.drawText(`${clientRoleLabel} — ${formatCpfCnpj(client?.cpf_cnpj ?? null)}`, {
      x: margin,
      y,
      size: 9,
      font: regular,
      color: rgb(0.42, 0.41, 0.39),
    });
    y -= 13;
    page.drawText(`Assinado eletronicamente · Cód. ${clientSignatureCode}`, {
      x: margin,
      y,
      size: 9,
      font: regular,
      color: rgb(0.42, 0.41, 0.39),
    });
    y -= 30;

    page.drawText("PÁGINA DE ASSINATURA ELETRÔNICA", { x: margin, y, size: 15, font: bold, color: rgb(0.07, 0.23, 0.37) });
    y -= 28;

    const rows: [string, string][] = [
      ["Documento:", contract.title],
      ["Signatário:", signatureCode.signer_name],
      ["Papel no contrato:", clientRoleLabel],
      [`${clientDocLabel} do signatário:`, formatCpfCnpj(client?.cpf_cnpj ?? null)],
      ["E-mail:", signatureCode.signer_email],
      ["WhatsApp:", formatWhatsApp(client?.telefone ?? null)],
      [`${orgRoleLabel} (Minha Empresa):`, org?.name ?? "—"],
      [`${orgDocLabel} de Minha Empresa:`, formatCpfCnpj(org?.cnpj ?? null)],
      ["Código de verificação:", clientSignatureCode],
    ];

    for (const [label, value] of rows) {
      drawLabelValue(page, y, label, value, fonts, margin, labelWidth);
      y -= 18;
    }

    y -= 12;
    const authRows: [string, string][] = [
      ["Autenticação:", "Assinatura eletrônica via OTP-Email (MP 2.200-2/2001)"],
      ["OTP validado em:", timestampBR],
      ["Assinatura registrada em:", timestampBR],
      ["IP do signatário:", ip ?? "Não disponível"],
      ["Geolocalização:", geolocation ?? "Não disponível"],
    ];
    for (const [label, value] of authRows) {
      drawLabelValue(page, y, label, value, fonts, margin, labelWidth);
      y -= 18;
    }

    page.drawText("Navegador (User-Agent):", { x: margin, y, size: 9.5, font: bold, color: rgb(0.15, 0.15, 0.17) });
    y -= 14;
    const ua = userAgent ?? "Não disponível";
    const uaMaxChars = 95;
    for (let i = 0; i < ua.length; i += uaMaxChars) {
      page.drawText(ua.slice(i, i + uaMaxChars), {
        x: margin,
        y,
        size: 9,
        font: regular,
        color: rgb(0.35, 0.34, 0.32),
      });
      y -= 13;
    }

    y -= 14;
    page.drawText("Hash SHA-256 do documento original:", {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: rgb(0.15, 0.15, 0.17),
    });
    y -= 15;
    page.drawText(documentHash, { x: margin, y, size: 9, font: regular, color: rgb(0.35, 0.34, 0.32) });

    y -= 28;
    page.drawText("Aceite eletrônico do signatário:", {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: rgb(0.15, 0.15, 0.17),
    });
    y -= 15;
    const acceptanceLines = [
      "Li o contrato e aceito assiná-lo eletronicamente nos termos da MP 2.200-2/2001 art. 10 §2º",
      "e Lei 14.063/2020.",
    ];
    for (const line of acceptanceLines) {
      page.drawText(line, { x: margin, y, size: 9.5, font: regular, color: rgb(0.25, 0.25, 0.27) });
      y -= 14;
    }

    const signedBytes = await pdfDoc.save();
    const signedPath = `${contract.org_id}/${contract_id}/assinado-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("contract-documents")
      .upload(signedPath, signedBytes, { contentType: "application/pdf", upsert: false });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "upload_failed" }), { status: 500 });
    }

    await supabase
      .from("signature_codes")
      .update({ used_at: signedAt.toISOString() })
      .eq("id", signatureCode.id);

    // rascunho -> em_revisao -> aguardando_assinatura já ocorreu no envio;
    // agora aguardando_assinatura -> assinado (único passo permitido pelo trigger).
    await supabase
      .from("contracts")
      .update({
        status: "assinado",
        signed_at: signedAt.toISOString(),
        signed_document_url: signedPath,
        document_hash: documentHash,
        signer_ip: ip ?? null,
        signer_user_agent: userAgent ?? null,
        signer_geolocation: geolocation,
      })
      .eq("id", contract_id);

    // Registro de auditoria dedicado — upsert por contract_id garante
    // idempotência (gerar de novo sobrescreve, nunca duplica).
    await supabase.from("signature_audit_logs").upsert(
      {
        org_id: contract.org_id,
        contract_id,
        signer_name: signatureCode.signer_name,
        signer_email: signatureCode.signer_email,
        signer_cpf: client?.cpf_cnpj ?? null,
        signer_whatsapp: client?.telefone ?? null,
        ip: ip ?? null,
        user_agent: userAgent ?? null,
        geolocation,
        otp_validated_at: signedAt.toISOString(),
        signature_registered_at: signedAt.toISOString(),
        document_hash: documentHash,
      },
      { onConflict: "contract_id" }
    );

    // Best-effort: e-mail de confirmação com o PDF assinado em anexo. Nunca
    // bloqueia nem reverte a assinatura, que já está registrada acima.
    await sendSignedConfirmationEmail({
      to: signatureCode.signer_email,
      signerName: signatureCode.signer_name,
      contractTitle: contract.title,
      documentHash,
      pdfBytes: signedBytes,
    });

    return new Response(JSON.stringify({ ok: true, documentHash, signedAt: signedAt.toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400 });
});
