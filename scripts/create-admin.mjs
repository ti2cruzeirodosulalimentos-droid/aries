// Cria (ou recupera) um usuário ADMIN confirmado no Supabase.
// Requer SUPABASE_SERVICE_ROLE_KEY no .env (server-only, ignora RLS).
// Uso: node scripts/create-admin.mjs <email> <senha> [nome]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Carrega o .env manualmente (sem depender da versão do Node).
try {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* segue com as variáveis do shell */
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || "Administrador";
if (!email || !password) {
  console.error("Uso: node scripts/create-admin.mjs <email> <senha> [nome]");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

let userId;
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (createErr) {
  if (/already|exist/i.test(createErr.message)) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) { console.error("✗ Erro ao listar usuários:", listErr.message); process.exit(1); }
    const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) { console.error("✗ Usuário já existe mas não foi localizado na listagem."); process.exit(1); }
    userId = found.id;
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    console.log("• Usuário já existia → senha redefinida e e-mail confirmado.");
  } else {
    console.error("✗ Erro ao criar usuário:", createErr.message);
    process.exit(1);
  }
} else {
  userId = created.user.id;
  console.log("• Usuário criado e confirmado.");
}

// Garante o papel admin (basta uma linha 'admin'; o trigger cria 'aluno' por padrão).
const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: "admin" });
if (roleErr && !/duplicate|unique|exist/i.test(roleErr.message)) {
  console.warn("⚠ Aviso ao definir papel admin:", roleErr.message);
} else {
  console.log("• Papel admin garantido.");
}

console.log("\n========= CREDENCIAIS DE ACESSO =========");
console.log("  URL local :  http://localhost:8082/");
console.log("  E-mail    : ", email);
console.log("  Senha     : ", password);
console.log("  Papel     :  admin");
console.log("=========================================");
