import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildTemplatesTemplate } from "@/lib/excel/templates";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const buffer = await buildTemplatesTemplate();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=modelo-templates.xlsx",
    },
  });
}
