import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STATUS_DISPLAY, resolveDisplayStatus, type ContractStatus } from "@/lib/contracts/status";
import { buildContractsReportCsv, buildContractsReportXlsx, type ContractReportRow } from "@/lib/excel/contracts-report";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const url = new URL(request.url);
  const de = url.searchParams.get("de");
  const ate = url.searchParams.get("ate");
  const formato = url.searchParams.get("formato") === "csv" ? "csv" : "xlsx";

  let query = supabase
    .from("contracts")
    .select(
      "title, status, valor, created_at, signed_at, clients(nome_razao_social), contract_templates(name), signature_codes(expires_at, created_at), profiles!contracts_created_by_fkey(full_name)"
    )
    .order("created_at", { ascending: false });

  if (de) query = query.gte("created_at", `${de}T00:00:00`);
  if (ate) query = query.lte("created_at", `${ate}T23:59:59`);

  const { data: contracts } = await query;

  const rows: ContractReportRow[] = (contracts ?? []).map((c) => {
    const codes = (c.signature_codes ?? []) as { expires_at: string; created_at: string }[];
    const latestCode = codes.reduce<{ expires_at: string; created_at: string } | null>(
      (latest, code) => (!latest || code.created_at > latest.created_at ? code : latest),
      null
    );
    const status =
      STATUS_DISPLAY[resolveDisplayStatus(c.status as ContractStatus, latestCode?.expires_at ?? null)];
    const client = c.clients as { nome_razao_social: string } | null;
    const template = c.contract_templates as { name: string } | null;
    const creator = c.profiles as { full_name: string } | null;

    return {
      title: c.title,
      clientName: client?.nome_razao_social ?? "",
      templateName: template?.name ?? "",
      statusLabel: status.label,
      valor: c.valor,
      creatorName: creator?.full_name ?? "",
      createdAt: c.created_at,
      signedAt: c.signed_at,
    };
  });

  if (formato === "csv") {
    const csv = "﻿" + buildContractsReportCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=relatorio-contratos.csv",
      },
    });
  }

  const buffer = await buildContractsReportXlsx(rows);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=relatorio-contratos.xlsx",
    },
  });
}
