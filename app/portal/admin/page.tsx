import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { UserEditor } from "@/components/user-editor";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/portal");
  const supabase = await createClient();
  const [{ data: users }, { count: permissions }, { count: activities }, { count: appointments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, active").order("full_name").limit(200),
    supabase.from("permission_requests").select("*", { count: "exact", head: true }),
    supabase.from("activities").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("appointments").select("*", { count: "exact", head: true }).gte("ends_at", new Date().toISOString()),
  ]);
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Administration</h1><p>Pilotage de la plateforme, comptes et activité.</p></div></div>
    <div className="metric-grid"><div className="metric"><span>Utilisateurs</span><strong>{users?.filter((item) => item.active).length || 0}</strong><div className="metric-detail">Comptes actifs</div></div><div className="metric"><span>Permissions</span><strong>{permissions || 0}</strong><div className="metric-detail">Historique total</div></div><div className="metric"><span>Activités</span><strong>{activities || 0}</strong><div className="metric-detail">Proposées</div></div><div className="metric"><span>Rendez-vous</span><strong>{appointments || 0}</strong><div className="metric-detail">À venir</div></div></div>
    <section className="card"><div className="card-header"><div><h2>Utilisateurs et profils</h2><p className="card-subtitle">La création des comptes se fait depuis Supabase Auth ; gérez ici l’accès et le rôle métier.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Accès</th><th>Action</th></tr></thead><tbody>{users?.length ? users.map((user) => <UserEditor key={user.id} user={user} />) : <tr><td className="empty" colSpan={4}>Aucun utilisateur.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
