import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { UserEditor } from "@/components/user-editor";
import { FacilityAdminPanel } from "@/components/facility-admin-panel";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { roleLabels, type AppRole } from "@/lib/types";

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
  const isDemo = profile.facilityConfig.demo === true;
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
  const visibleUsers = isDemo ? users.filter((item) => item.active) : users;
  const activeModules = [
    ["permissions", "Permissions"],
    ["activities", "Activités"],
    ["housekeeping", "Hôtellerie"],
    ["sport", "Salle de sport"],
    ["visits", "Visites"],
    ["messaging", "Messagerie"],
    ["menus", "Menus"],
    ["information", "Informations"],
  ].filter(([key]) => profile.facilityConfig[`features.${key}`] !== false);

  return <PortalShell profile={profile}>
    <div className="page-intro admin-intro"><div><span className="section-kicker">Configuration établissement</span><h1>Administration · {profile.facility.name}</h1><p>{isDemo ? "Vue de démonstration sécurisée : la configuration structurante est en lecture seule." : "Gérez les accès, les invitations, les modules et les règles de fonctionnement de la clinique."}</p></div><div className="page-intro-actions"><Link href="/portal/pulse" className="button button-secondary">Voir l’activité</Link><Link href="/portal/roi" className="button button-primary">Pilotage ROI</Link></div></div>

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

    {isDemo ? <section className="card" style={{ marginTop: 18 }}>
      <div className="card-header"><div><h2>Mode présentation verrouillé</h2><p className="card-subtitle">Les parcours métier restent interactifs. Les actions pouvant modifier la structure de la démo sont volontairement retirées de cet écran.</p></div><span className="badge badge-success">Démo sécurisée</span></div>
      <div className="card-body">
        <p>Country Pack, création d’établissement, invitations, rôles et réglages globaux sont en lecture seule pendant la présentation. L’invitation patient par e-mail reste désactivée tant que le domaine transactionnel n’est pas validé.</p>
        <div className="market-chips" style={{ marginTop: 16 }}>{activeModules.map(([, label]) => <span key={label}>{label}</span>)}</div>
      </div>
    </section> : <FacilityAdminPanel profile={profile} />}

    <section id="users" className="card" style={{ marginTop: 18 }}>
      <div className="card-header"><div><h2>Utilisateurs et rôles</h2><p className="card-subtitle">{isDemo ? "Comptes actifs visibles dans la démonstration. Les modifications sont désactivées pendant la présentation." : `Le rôle est propre à ${profile.facility.name}. Un même compte peut avoir un autre rôle dans une autre clinique.`}</p></div></div>
      <div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Utilisateur</th><th>Rôle dans cette clinique</th><th>Accès</th>{!isDemo && <th>Action</th>}</tr></thead><tbody>{visibleUsers.length ? visibleUsers.map((user) => isDemo ? <tr key={user.id}><td>{user.full_name}</td><td>{roleLabels[user.role]}</td><td><span className="badge badge-success">Actif</span></td></tr> : <UserEditor key={user.id} user={user} />) : <tr><td className="empty" colSpan={isDemo ? 3 : 4}>Aucun utilisateur pour le moment.</td></tr>}</tbody></table></div>
    </section>
  </PortalShell>;
}