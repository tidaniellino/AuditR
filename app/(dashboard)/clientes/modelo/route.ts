import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildClientsTemplate } from "@/lib/excel/clients";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const buffer = await buildClientsTemplate();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=modelo-clientes.xlsx",
    },
  });
}
