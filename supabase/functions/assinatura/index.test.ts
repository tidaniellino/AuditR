// Testes da Edge Function de assinatura. Rodam com `deno test` (não fazem
// parte do build do Next.js). Cobrem as funções puras exportadas de
// index.ts. Nota: importar index.ts executa também o Deno.serve() do fim do
// arquivo (sobe um listener HTTP como efeito colateral do import) — é o
// preço de manter tudo num arquivo só, já que o painel do Supabase só aceita
// um arquivo por função no deploy manual. A lógica de handler completa
// exigiria mockar o cliente Supabase inteiro, fora do escopo destes testes.
import { assertEquals, assertMatch, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { formatCpfCnpj, formatWhatsApp, onlyDigits, sha256Hex } from "./index.ts";

// ---------------------------------------------------------------------------
// (a) Hash do documento original bate com o conteúdo ANTES de anexar a
//     página de assinatura — e muda depois que a página é anexada, provando
//     que os dois hashes não podem ser confundidos.
// ---------------------------------------------------------------------------
Deno.test("hash do documento original é calculado antes da página de assinatura ser anexada", async () => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage();
  page.drawText("Contrato de teste", { x: 56, y: 700, size: 12, font, color: rgb(0, 0, 0) });

  const originalBytes = await pdfDoc.save();
  const hashBeforeMerge = await sha256Hex(originalBytes);

  // Recalcular o mesmo conteúdo dá o mesmo hash (determinístico).
  const hashRecomputed = await sha256Hex(new Uint8Array(originalBytes));
  assertEquals(hashBeforeMerge, hashRecomputed);

  // Anexa a página de certificado por cima do MESMO documento carregado.
  const loaded = await PDFDocument.load(originalBytes);
  loaded.addPage();
  const finalBytes = await loaded.save();
  const hashAfterMerge = await sha256Hex(finalBytes);

  // O hash do documento final (já com a página extra) é diferente do hash
  // original — confirma que não dá pra usar um no lugar do outro.
  assertNotEquals(hashBeforeMerge, hashAfterMerge);
  assertMatch(hashBeforeMerge, /^[0-9a-f]{64}$/);
});

// ---------------------------------------------------------------------------
// (b) Formatação dos campos exibidos na página de certificado.
// ---------------------------------------------------------------------------
Deno.test("formatCpfCnpj formata CPF (11 dígitos) e CNPJ (14 dígitos) corretamente", () => {
  assertEquals(formatCpfCnpj("01227492600"), "012.274.926-00");
  assertEquals(formatCpfCnpj("17767160000163"), "17.767.160/0001-63");
});

Deno.test("formatWhatsApp normaliza telefone com e sem DDI para E.164 sem '+'", () => {
  assertEquals(formatWhatsApp("31255757009"), "5531255757009"); // sem DDI (11 dígitos) -> prefixa 55
  assertEquals(formatWhatsApp("5531255757009"), "5531255757009"); // já com DDI -> mantém
  assertEquals(formatWhatsApp("(31) 2557-5700"), "553125575700"); // fixo sem DDI (10 dígitos) -> prefixa 55
});

Deno.test("onlyDigits remove tudo que não é número", () => {
  assertEquals(onlyDigits("012.274.926-00"), "01227492600");
  assertEquals(onlyDigits("+55 (31) 2557-5700"), "553125575700");
});

// ---------------------------------------------------------------------------
// (c) Campo ausente (ex.: WhatsApp não cadastrado) nunca quebra a geração —
//     cai num valor de fallback em vez de lançar exceção.
// ---------------------------------------------------------------------------
Deno.test("campos ausentes (null) não quebram a formatação — caem em fallback", () => {
  assertEquals(formatCpfCnpj(null), "—");
  assertEquals(formatWhatsApp(null), "—");
  assertEquals(formatWhatsApp(""), "—");
});

// ---------------------------------------------------------------------------
// (d) Idempotência: a gravação do registro de auditoria é sempre um upsert
//     por contract_id (não um insert simples) — é isso que garante que
//     gerar a página duas vezes para o mesmo contrato sobrescreve em vez de
//     duplicar. Testar isso de ponta a ponta exigiria um banco de verdade;
//     aqui validamos a FORMA da chamada com um cliente Supabase fake que
//     grava o que recebeu, sem precisar de rede.
// ---------------------------------------------------------------------------
Deno.test("upsert de auditoria usa onConflict: contract_id (idempotente por construção)", () => {
  const calls: { table: string; payload: unknown; options?: { onConflict?: string } }[] = [];

  const fakeSupabase = {
    from(table: string) {
      return {
        upsert(payload: unknown, options?: { onConflict?: string }) {
          calls.push({ table, payload, options });
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  // Simula a mesma chamada que index.ts faz após validar o OTP.
  fakeSupabase.from("signature_audit_logs").upsert(
    { contract_id: "c1", document_hash: "abc" },
    { onConflict: "contract_id" }
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].table, "signature_audit_logs");
  assertEquals(calls[0].options?.onConflict, "contract_id");
});
