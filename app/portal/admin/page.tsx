import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { UserEditor } from "@/components/user-editor";
import { FacilityAdminPanel } from "@/components/facility-admin-panel";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

export const dynamic = "force-dynamic";

type MembershipRow = {
  user_id: string;
  role: AppRole;
  active: boolean;
  user: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
};

export default async function AdminPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/portal");
  const supabase = await createClient();
  const [{ data: memberships }, { count: permissions }, { count: activities }, { count: appointments }, { count: pendingInvitations }] = await Promise.all([
    supabase.from("facility_memberships").select("user_id, role, active, user:profiles!facility_memberships_user_id_fkey(id, full_name)").eq("facility_id", profile.facility.id).order("created_at"),
    supabase.from("permission_requests").select("*", { count: "exact", head: true }),
    supabase.from("activities").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("appointments").select("*", { count: "exact", head: true }).gte("ends_at", new Date().toISOString()),
    supabase.from("facility_invitations").select("*", { count: "exact", head: true }).eq("facility_id", profile.facility.id).is("accepted_at", null),
  ]);

  const users = ((memberships || []) as MembershipRow[]).flatMap((membership) => {
    const relation = Array.isArray(membership.user) ? membership.user[0] : membership.user;
    return relation ? [{ id: relation.id, full_name: relation.full_name, role: membership.role, active: membership.active }] : [];
  });

  return <PortalShell profile={profile}>
    <div className="page-intro admin-intro"><div><span className="section-kicker">Configuration établissement</span><h1>Administration · {profile.facility.name}</h1><p>Gérez les accès, les invitations, les modules et les règles de fonctionnement de la clinique.</p></div><div className="page-intro-actions"><Link href="/portal/pulse" className="button button-secondary">Voir l’activité</Link><Link href="/portal/roi" className="button button-primary">Pilotage ROI</Link></div></div>

    <nav className="admin-shortcuts" aria-label="Raccourcis administration">
      <Link href="/portal/stays"><strong>Séjours</strong><span>Admissions, chambres et présence</span></Link>
      <Link href="/portal/discharges"><strong>Sorties</strong><span>Suivi des sorties à préparer</span></Link>
      <Link href="/portal/housekeeping"><strong>Hôtellerie</strong><span>Chambres et tâches opérationnelles</span></Link>
      <a href="#users"><strong>Utilisateurs</strong><span>Rôles et accès</span></a>
    </nav>

    <div className="metric-grid">
      <div className="metric"><span>Utilisateurs</span><strong>{users.filter((item) => item.active).length}</strong><div className="metric-detail">Membres actifs de cette clinique</div></div>
      <div className="metric"><span>Permissions</span><strong>{permissions || 0}</strong><div className="metric-detail">Historique de cette clinique</div></div>
      <div className="metric"><span>Activités</span><strong>{activities || 0}</strong><div className="metric-detail">Proposées dans cette clinique</div></div>
      <div className="metric"><span>Rendez-vous</span><strong>{appointments || 0}</strong><div className="metric-detail">À venir</div></div>
      <div className="metric"><span>Invitations</span><strong>{pendingInvitations || 0}</strong><div className="metric-detail">En attente d’acceptation</div></div>
    </div>

    <FacilityAdminPanel profile={profile} />

    <section id="users" className="card" style={{ marginTop: 18 }}><div className="card-header"><div><h2>Utilisateurs et rôles</h2><p className="card-subtitle">Le rôle est propre à {profile.facility.name}. Un même compte peut avoir un autre rôle dans une autre clinique.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Utilisateur</th><th>Rôle dans cette clinique</th><th>Accès</th><th>Action</th></tr></thead><tbody>{users.length ? users.map((user) => <UserEditor key={user.id} user={user} />) : <tr><td className="empty" colSpan={4}>Aucun utilisateur pour le moment.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
