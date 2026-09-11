// Usage : node --env-file=.env.local scripts/seed-housekeeping-demo.mjs
// Fournir SUPABASE_SERVICE_ROLE_KEY dans l'environnement du terminal uniquement.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires. Ne placez jamais la clé de service dans une variable NEXT_PUBLIC_.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: schemaError } = await db.from("housekeeping_rosters").select("service_date").limit(1);
if (schemaError) throw new Error("Appliquer les deux migrations v12 avant de créer les comptes : " + schemaError.message);
const names = ["Amélie Martin", "Karim Benali", "Sophie Laurent", "Lucas Moreau", "Nadia Diallo", "Thomas Petit", "Élodie Bernard", "Hugo Robert", "Inès Dubois", "Mehdi Garcia"];
const definitions = names.map((full_name, i) => ({ full_name, role: "technical", email: `technique${String(i + 1).padStart(2, "0")}@demo.aura.test` }));
definitions.push({ full_name: "Claire Roussel", role: "governance", email: "gouvernante@demo.aura.test" });
const existing = [];
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  existing.push(...data.users);
  if (data.users.length < 100) break;
}
let saved = [];
try { saved = JSON.parse(await readFile("demo-accounts.local.json", "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const accounts = [];
for (const definition of definitions) {
  let user = existing.find(u => u.email === definition.email);
  let password = saved.find(a => a.email === definition.email)?.password;
  if (user && user.user_metadata?.aura_demo !== "housekeeping-v12") throw new Error(`Compte existant non identifié comme démo : ${definition.email}. Aucun changement appliqué à ce compte.`);
  if (!user) {
    password = randomBytes(24).toString("base64url");
    const { data, error } = await db.auth.admin.createUser({ email: definition.email, password, email_confirm: true, user_metadata: { full_name: definition.full_name, aura_demo: "housekeeping-v12" } });
    if (error) throw error;
    user = data.user;
    // Sauvegarde immédiate : une interruption ne perd pas les accès déjà créés.
    saved = [...saved.filter(a => a.email !== definition.email), { ...definition, id: user.id, password }];
    await writeFile("demo-accounts.local.json", JSON.stringify(saved, null, 2), { mode: 0o600 });
  }
  const { error } = await db.from("profiles").update({ role: definition.role, active: true, full_name: definition.full_name }).eq("id", user.id);
  if (error) throw error;
  accounts.push({ ...definition, id: user.id, password: password || "Mot de passe existant conservé" });
}
await writeFile("demo-accounts.local.json", JSON.stringify(accounts, null, 2), { mode: 0o600 });
// Les affectations sont enregistrées par le même RPC que le gouvernant.
const governor = accounts.at(-1);
if (governor.password === "Mot de passe existant conservé") {
  console.log("11 comptes prêts. Configurez les affectations depuis l’espace gouvernant.");
} else {
  const session = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await session.auth.signInWithPassword({ email: governor.email, password: governor.password });
  if (error) throw error;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const { data: current, error: dashboardError } = await session.rpc("housekeeping_dashboard", { p_date: date });
  if (dashboardError) throw dashboardError;
  if (!current.rosterDate) {
    const { error: rosterError } = await session.rpc("housekeeping_save_roster", { p_date: date, p_floors: accounts.slice(0, 8).map(a => a.id), p_lifts: [accounts[8].id, accounts[9].id, accounts[0].id] });
    if (rosterError) throw rosterError;
  }
  await session.auth.signOut();
  console.log("10 agents et 1 gouvernante prêts. Affectations initiales vérifiées.");
}
console.log("Identifiants enregistrés dans demo-accounts.local.json (exclu de Git). Aucun e-mail envoyé.");
