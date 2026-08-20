// Edge Function pública (verify_jwt=false): usada pela página de assinatura,
// onde o cliente que assina NÃO está autenticado no sistema. Roda com a
// service_role key (injetada automaticamente pelo runtime) para poder ler e
// escrever além do RLS — o código de 6 dígitos (hash) é o único mecanismo de
// autenticação aqui, então toda ação sensível exige o código correto.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  let body: { action?: string; contract_id?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
  }

  const { action, contract_id, code } = body;
  if (!contract_id) {
    return new Response(JSON.stringify({ error: "missing_contract_id" }), { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, status, org_id, generated_pdf_path, signed_document_url")
    .eq("id", contract_id)
    .single();

  if (!contract) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
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

    return new Response(
      JSON.stringify({
        title: contract.title,
        orgName: org?.name ?? "",
        status: contract.status,
        signerName: activeCode?.signer_name ?? null,
        hasValidCode,
        codeExpired: !!activeCode && !activeCode.used_at && new Date(activeCode.expires_at) <= new Date(),
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
    if (signatureCode.attempts >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "too_many_attempts" }), { status: 429 });
    }

    const incomingHash = await sha256Hex(code);
    if (incomingHash !== signatureCode.code_hash) {
      await supabase
        .from("signature_codes")
        .update({ attempts: signatureCode.attempts + 1 })
        .eq("id", signatureCode.id);
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

    const signedAt = new Date();
    const pdfDoc = await PDFDocument.load(await originalFile.arrayBuffer());
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage();
    const { width } = page.getSize();
    const margin = 56;
    let y = page.getSize().height - margin;

    const writeLine = (text: string, size = 10, color = rgb(0.1, 0.1, 0.12)) => {
      page.drawText(text, { x: margin, y, size, font, color, maxWidth: width - margin * 2 });
      y -= size + 8;
    };

    writeLine("ASSINATURA ELETRÔNICA", 13, rgb(0.09, 0.23, 0.37));
    y -= 6;
    writeLine(`Assinado por: ${signatureCode.signer_name}`);
    writeLine(`E-mail: ${signatureCode.signer_email}`);
    writeLine(`Data e hora: ${signedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília)`);
    writeLine(`Documento: ${contract.title}`);
    y -= 6;
    writeLine(
      "Este documento foi assinado eletronicamente por meio de código de verificação enviado ao",
      9,
      rgb(0.4, 0.4, 0.4)
    );
    writeLine("e-mail do signatário, com validade jurídica nos termos do art. 10, §2º da MP 2.200-2/2001.", 9, rgb(0.4, 0.4, 0.4));

    const signedBytes = await pdfDoc.save();
    const documentHash = await sha256Hex(signedBytes);
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
      })
      .eq("id", contract_id);

    return new Response(JSON.stringify({ ok: true, documentHash, signedAt: signedAt.toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400 });
});
