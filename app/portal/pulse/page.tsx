import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { facilityFeatureEnabled, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";
import { parisDate, type HousekeepingData } from "@/lib/housekeeping";

export const dynamic = "force-dynamic";

type Rel = { full_name: string | null } | { full_name: string | null }[] | null;
type Stay = { id: string; presence: string | null; room_number: string | null; patient: Rel };
type Permission = { id: string; departure_at: string; return_at: string; status: string; patient: Rel };
type Appointment = { id: string; title: string; starts_at: string; location: string | null; patient: Rel };
type Visit = { id: string; scheduled_start: string; status: string; visitor_one_name: string; patient: Rel };

const allowed = ["doctor", "manager", "nurse", "reception", "admin", "governance", "technical"];
const nameOf = (rel: Rel) => (Array.isArray(rel) ? rel[0]?.full_name : rel?.full_name) || "Patient";

export default async function PulsePage() {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");

  const supabase = await createClient();
  const now = new Date();
  const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const today = parisDate(now, profile.facility.timezone);
  const showVisits = facilityFeatureEnabled(profile, "visits");
  const dt = (v: string) => formatDateTime(v, profile.facility.locale, profile.facility.timezone);
  const tm = (v: string) => formatTime(v, profile.facility.locale, profile.facility.timezone);

  const [staysQ, permsQ, apptsQ, visitsQ] = await Promise.all([
    supabase.from("patient_stays").select("id,presence,room_number,patient:profiles!patient_stays_patient_id_fkey(full_name)").is("ended_at", null).order("room_number").limit(12),
    supabase.from("permission_requests").select("id,departure_at,return_at,status,patient:profiles!permission_requests_patient_id_fkey(full_name)").in("status", ["submitted", "waiting", "approved", "departed"]).order("departure_at").limit(12),
    supabase.from("appointments").select("id,title,starts_at,location,patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at", now.toISOString()).lte("starts_at", in36h.toISOString()).order("starts_at").limit(10),
    showVisits ? supabase.from("visit_notifications").select("id,scheduled_start,status,visitor_one_name,patient:profiles!visit_notifications_patient_id_fkey(full_name)").gte("scheduled_start", `${today}T00:00:00`).lte("scheduled_start", `${today}T23:59:59`).order("scheduled_start").limit(10) : Promise.resolve({ data: [] }),
  ]);

  const stays = (staysQ.data || []) as unknown as Stay[];
  const permissions = (permsQ.data || []) as unknown as Permission[];
  const appointments = (apptsQ.data || []) as unknown as Appointment[];
  const visits = (visitsQ.data || []) as unknown as Visit[];
  const waiting = permissions.filter((p) => ["submitted", "waiting"].includes(p.status));
  const approved = permissions.filter((p) => p.status === "approved");
  const departed = permissions.filter((p) => p.status === "departed");
  const onSite = visits.filter((v) => v.status === "arrived");
  const late = departed.filter((p) => new Date(p.return_at).getTime() < now.getTime());

  let housekeeping: HousekeepingData | null = null;
  if (["governance", "technical", "admin"].includes(profile.role) && facilityFeatureEnabled(profile, "housekeeping")) {
    const { data } = await supabase.rpc("housekeeping_dashboard", { p_date: today });
    housekeeping = data as HousekeepingData | null;
  }
  const hkTotal = housekeeping?.tasks.length || 0;
  const hkDone = housekeeping?.tasks.filter((t) => !!t.completed_at).length || 0;
  const hkPct = hkTotal ? Math.round((hkDone / hkTotal) * 100) : 0;

  const alerts = [
    ...late.map((p) => ({ title: "Retour attendu", detail: `${nameOf(p.patient)} · prévu ${tm(p.return_at)}`, tone: "danger" })),
    ...waiting.slice(0, 2).map((p) => ({ title: "Permission à valider", detail: `${nameOf(p.patient)} · ${dt(p.departure_at)}`, tone: "warning" })),
    ...onSite.slice(0, 2).map((v) => ({ title: "Visiteur sur site", detail: `${v.visitor_one_name} · ${nameOf(v.patient)}`, tone: "success" })),
  ].slice(0, 5);

  const presence = (value: string | null) => value === "out" ? "Sorti" : value === "appointment" ? "En rendez-vous" : "Présent";
  const permissionLabel = (status: string) => status === "approved" ? "Validée" : status === "departed" ? "Sorti" : "En attente";

  return <PortalShell profile={profile}>
    <div className="pulse-head"><div><div className="pulse-kicker">Tour de contrôle de la journée</div><h1>AURA Pulse</h1><p>Les informations importantes, réunies au même endroit pour agir vite.</p></div><div className="pulse-live"><span />En temps réel</div></div>

    <section className="pulse-metrics">
      <div className="pulse-metric"><b>◎</b><div><strong>{stays.length}</strong><span>Patients actifs</span><small>{stays.filter((s) => s.presence !== "out").length} présents</small></div></div>
      <div className="pulse-metric"><b>✓</b><div><strong>{waiting.length}</strong><span>Permissions à traiter</span><small>{approved.length} autorisées</small></div></div>
      <div className="pulse-metric"><b>◷</b><div><strong>{appointments.length}</strong><span>Rendez-vous à venir</span><small>Prochaines 36 h</small></div></div>
      <div className="pulse-metric"><b>♧</b><div><strong>{onSite.length}</strong><span>Visiteurs sur site</span><small>{visits.length} aujourd’hui</small></div></div>
      <div className="pulse-metric pulse-metric-alert"><b>!</b><div><strong>{alerts.length}</strong><span>Points d’attention</span><small>{late.length ? `${late.length} retour en retard` : "Sous contrôle"}</small></div></div>
    </section>

    <section className="pulse-grid">
      <article className="pulse-card"><header><div><h2>◎ Patients</h2><p>{stays.length} séjours actifs</p></div><Link href="/portal/stays">Voir tous →</Link></header><div>{stays.slice(0, 6).map((s) => <div className="pulse-row" key={s.id}><div><strong>{nameOf(s.patient)}</strong><small>Chambre {s.room_number || "—"}</small></div><em>{presence(s.presence)}</em></div>)}</div></article>

      <article className="pulse-card"><header><div><h2>✓ Permissions</h2><p>{permissions.length} demandes actives</p></div><Link href="/portal/permissions">Voir toutes →</Link></header><div>{permissions.slice(0, 6).map((p) => <div className="pulse-row" key={p.id}><div><strong>{nameOf(p.patient)}</strong><small>{dt(p.departure_at)}</small></div><em>{permissionLabel(p.status)}</em></div>)}</div></article>

      <article className="pulse-card"><header><div><h2>◷ Rendez-vous</h2><p>{appointments.length} prochains créneaux</p></div><Link href="/portal/appointments">Planning →</Link></header><div>{appointments.slice(0, 6).map((a) => <div className="pulse-time" key={a.id}><time>{tm(a.starts_at)}</time><div><strong>{nameOf(a.patient)}</strong><small>{a.title}{a.location ? ` · ${a.location}` : ""}</small></div></div>)}</div></article>

      <article className="pulse-card"><header><div><h2>♧ Visites</h2><p>{visits.length} aujourd’hui</p></div><Link href="/portal/visits">Voir toutes →</Link></header><div>{visits.length ? visits.slice(0, 6).map((v) => <div className="pulse-row" key={v.id}><div><strong>{v.visitor_one_name}</strong><small>{nameOf(v.patient)} · {tm(v.scheduled_start)}</small></div><em>{v.status === "arrived" ? "Sur site" : v.status === "departed" ? "Terminée" : "À venir"}</em></div>) : <p className="pulse-empty">Aucune visite aujourd’hui.</p>}</div></article>

      <article className="pulse-card"><header><div><h2>! Alertes & actions</h2><p>Ce qui demande votre attention</p></div></header><div>{alerts.length ? alerts.map((a, i) => <div className="pulse-alert" key={i}><i className={a.tone} /><div><strong>{a.title}</strong><small>{a.detail}</small></div></div>) : <div className="pulse-ok"><b>✓</b><div><strong>Tout est sous contrôle</strong><small>Aucun point critique détecté.</small></div></div>}</div></article>

      <article className="pulse-card"><header><div><h2>◇ Tâches du jour</h2><p>{housekeeping ? "Hôtellerie & exploitation" : "Vue selon votre rôle"}</p></div>{housekeeping && <Link href="/portal/housekeeping">Hôtellerie →</Link>}</header>{housekeeping ? <div><div className="pulse-progress-copy"><strong>{hkDone} / {hkTotal}</strong><span>{hkPct}% terminé</span></div><div className="pulse-progress"><span style={{ width: `${hkPct}%` }} /></div>{housekeeping.tasks.filter((t) => !t.completed_at).slice(0, 4).map((t) => <div className="pulse-row" key={t.id}><div><strong>{t.target}</strong><small>{t.period}</small></div><em>À faire</em></div>)}</div> : <div className="pulse-role-note">Les détails d’exploitation sont visibles par Gouvernance, Technique et Administrateur.</div>}</article>
    </section>

    <section className="pulse-brief"><div><b>✦</b><span><strong>Briefing de la journée</strong><small>Généré automatiquement à partir des flux AURA</small></span></div><div className="pulse-brief-items"><span><strong>{late.length}</strong> retour attendu</span><span><strong>{appointments.length}</strong> rendez-vous</span><span><strong>{waiting.length}</strong> permissions</span><span><strong>{onSite.length}</strong> visite sur site</span></div></section>
  </PortalShell>;
}
