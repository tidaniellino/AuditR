// Teste de integração (não faz parte de `npm test`) para a Regra 4 —
// verifica só a parte que dá pra testar sem credenciais reais do Google: o
// trigger handle_new_user() aceitando um cadastro SEM org_id no metadata
// (o formato que o Supabase usa pra login social) e auto-criando uma
// organização nova com o usuário como Sócio.
//
// NÃO cobre (precisa de credenciais reais do Google Cloud configuradas no
// Supabase Dashboard → Authentication → Providers → Google, e um navegador
// real completando o consentimento OAuth):
//   - vinculação automática quando o e-mail do Google já existe como conta
//     e-mail/senha com email_verified=true;
//   - recusa quando email_verified=false.
// Essas duas exigem um teste manual ponta-a-ponta depois que as credenciais
// forem cadastradas — ver ENTREGÁVEIS no relatório da tarefa.
//
// Uso: node scripts/test-google-oauth-signup.mjs
// Requer no ambiente (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // Sem .env.local — assume que as vars já estão no ambiente.
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const testEmail = `oauth-signup-test-${Date.now()}@example.com`;
let createdUserId;

try {
  console.log(`Criando usuário de teste sem org_id no metadata (${testEmail})...`);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: testEmail,
    email_confirm: true,
    // Simula o metadata que o Supabase grava numa identidade do Google:
    // nome/avatar do provedor, nunca org_id (isso só existe no fluxo de
    // onboarding por e-mail, via create_organization()).
    user_metadata: { full_name: "Teste OAuth Google", avatar_url: "https://example.com/avatar.png" },
  });

  if (createError || !created.user) {
    throw new Error(
      `Falha ao criar usuário — handle_new_user() provavelmente ainda está rejeitando cadastros sem org_id (migração 20260926120000_google_oauth_signup.sql pendente de aplicar). Detalhe: ${createError?.message}`
    );
  }
  createdUserId = created.user.id;
  console.log("✓ Usuário criado:", createdUserId);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("org_id, role, full_name")
    .eq("id", createdUserId)
    .single();

  if (profileError || !profile) throw new Error(`Profile não foi criado: ${profileError?.message}`);
  if (profile.role !== "socio") throw new Error(`Esperava role 'socio', veio '${profile.role}'`);
  console.log("✓ Profile criado com role 'socio', org_id:", profile.org_id);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, owner_claimed_at")
    .eq("id", profile.org_id)
    .single();
  if (orgError || !org) throw new Error(`Organização não foi criada: ${orgError?.message}`);
  if (!org.owner_claimed_at) throw new Error("owner_claimed_at deveria estar preenchido para o Sócio fundador.");
  console.log("✓ Organização nova criada e reivindicada.");

  const { count: templateCount } = await admin
    .from("contract_templates")
    .select("*", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .eq("is_system_default", true);
  console.log(`✓ ${templateCount ?? 0} modelo(s) padrão do sistema semeados na org nova.`);

  console.log("\nTUDO OK — cadastro via Google (sem org_id) provisiona organização + Sócio corretamente.");
} catch (err) {
  console.error("\nFALHOU:", err.message);
  process.exitCode = 1;
} finally {
  if (createdUserId) {
    console.log("\nLimpando dados de teste...");
    const { data: profile } = await admin.from("profiles").select("org_id").eq("id", createdUserId).maybeSingle();
    await admin.auth.admin.deleteUser(createdUserId);
    if (profile?.org_id) {
      await admin.from("contract_templates").delete().eq("org_id", profile.org_id);
      await admin.from("organizations").delete().eq("id", profile.org_id);
    }
    console.log("✓ Limpo.");
  }
}
