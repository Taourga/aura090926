import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { roleLabels, type AppRole } from "@/lib/types";

export const dynamic = "force-dynamic";

type UxEvent = {
  event_type: "page_view" | "nav_click" | "action_click" | "menu_open";
  path: string;
  target: string | null;
  role: AppRole;
  session_id: string;
  created_at: string;
};

export default async function UxDashboardPage() {
  const profile = await requireProfile();
  if (!["admin", "governance", "manager"].includes(profile.role)) redirect("/portal");
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase.from("ux_events").select("event_type,path,target,role,session_id,created_at").eq("facility_id", profile.facility.id).gte("created_at", since).order("created_at", { ascending: false }).limit(5000);
  const events = (data || []) as UxEvent[];
  const sessions = new Set(events.map((event) => event.session_id));
  const clicks = events.filter((event) => event.event_type === "nav_click" || event.event_type === "action_click");
  const views = events.filter((event) => event.event_type === "page_view");
  const avgClicks = sessions.size ? Math.round((clicks.length / sessions.size) * 10) / 10 : 0;

  const byRole = new Map<AppRole, { sessions: Set<string>; clicks: number; views: number }>();
  for (const event of events) {
    const current = byRole.get(event.role) || { sessions: new Set<string>(), clicks: 0, views: 0 };
    current.sessions.add(event.session_id);
    if (event.event_type === "page_view") current.views += 1;
    if (event.event_type === "nav_click" || event.event_type === "action_click") current.clicks += 1;
    byRole.set(event.role, current);
  }

  const destinations = new Map<string, number>();
  for (const event of clicks) if (event.target) destinations.set(event.target, (destinations.get(event.target) || 0) + 1);
  const topDestinations = [...destinations.entries()].sort((a,b) => b[1] - a[1]).slice(0, 10);

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><span className="section-kicker">Tests navigation · 30 derniers jours</span><h1>Mesure UX</h1><p>Mesure uniquement pendant les sessions de test explicitement activées. Aucun nom de patient, message ou contenu de formulaire n’est enregistré.</p></div></div>
    {error ? <section className="card"><div className="card-body"><p role="alert">Les mesures UX ne sont pas disponibles pour le moment.</p></div></section> : <>
      <section className="metric-grid">
        <article className="metric"><span>Sessions testées</span><strong>{sessions.size}</strong><div className="metric-detail">tous profils confondus</div></article>
        <article className="metric"><span>Pages vues</span><strong>{views.length}</strong><div className="metric-detail">dans le portail</div></article>
        <article className="metric"><span>Clics navigation</span><strong>{clicks.length}</strong><div className="metric-detail">destinations anonymisées</div></article>
        <article className="metric"><span>Clics / session</span><strong>{avgClicks}</strong><div className="metric-detail">à comparer entre profils</div></article>
      </section>
      <section className="card" style={{ marginBottom: 18 }}><div className="card-header"><div><h2>Lecture par profil</h2><p className="card-subtitle">À utiliser avec 3 à 5 testeurs minimum par rôle avant de conclure.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Profil</th><th>Sessions</th><th>Pages vues</th><th>Clics</th><th>Clics / session</th></tr></thead><tbody>{[...byRole.entries()].sort((a,b)=>b[1].sessions.size-a[1].sessions.size).map(([role,stats])=><tr key={role}><td>{roleLabels[role] || role}</td><td>{stats.sessions.size}</td><td>{stats.views}</td><td>{stats.clicks}</td><td>{stats.sessions.size ? Math.round((stats.clicks/stats.sessions.size)*10)/10 : 0}</td></tr>)}</tbody></table></div></section>
      <section className="card"><div className="card-header"><div><h2>Destinations les plus utilisées</h2><p className="card-subtitle">Les identifiants dynamiques sont remplacés par :id avant stockage.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Destination</th><th>Clics</th></tr></thead><tbody>{topDestinations.length ? topDestinations.map(([target,total])=><tr key={target}><td>{target}</td><td>{total}</td></tr>) : <tr><td colSpan={2} className="empty">Aucune session de test mesurée pour le moment.</td></tr>}</tbody></table></div></section>
    </>}
  </PortalShell>;
}
