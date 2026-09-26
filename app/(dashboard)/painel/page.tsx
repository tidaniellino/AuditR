import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthEventTracker } from "@/components/auth/AuthEventTracker";

async function countRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "clients" | "clauses" | "contracts"
) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function DashboardHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  const [clients, clauses, contracts] = await Promise.all([
    countRows(supabase, "clients"),
    countRows(supabase, "clauses"),
    countRows(supabase, "contracts"),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];

  const stats = [
    { label: "Clientes cadastrados", value: clients, href: "/clientes" },
    { label: "Cláusulas na biblioteca", value: clauses, href: "/clausulas" },
    { label: "Contratos em andamento", value: contracts, href: "/contratos" },
  ];

  return (
    <div>
      <AuthEventTracker />
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Visão geral</p>
      <h1 className="mt-2 font-display text-3xl text-ink_text">
        {firstName ? `Bem-vindo(a), ${firstName}.` : "Bem-vindo(a)."}
      </h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        Contratos em andamento, pendências de revisão e assinaturas aguardando aparecem aqui assim
        que o escritório começar a cadastrar clientes e cláusulas.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="rounded-card border border-edge bg-card px-5 py-4 shadow-sm shadow-ink-900/5 transition-colors hover:border-brand-via"
          >
            <p className="font-mono text-3xl text-ink_text">{stat.value}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </Link>
        ))}
      </div>

      {clients === 0 && (
        <div className="mt-8 rounded-card border border-dashed border-edge bg-card px-6 py-5">
          <p className="text-sm font-medium text-ink_text">Primeiro passo: cadastre um cliente</p>
          <p className="mt-1 text-sm text-muted">
            Todo contrato parte de um cliente PF ou PJ. Comece pelo cadastro — para PJ, os dados são
            preenchidos automaticamente a partir da Receita Federal.
          </p>
          <Link
            href="/clientes/novo"
            className="mt-3 inline-flex text-sm font-medium text-brand-via underline underline-offset-2"
          >
            Cadastrar cliente →
          </Link>
        </div>
      )}
    </div>
  );
}
