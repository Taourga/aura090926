import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { OperationalTaskButton } from "@/components/operational-task-button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Rel = { full_name?: string | null; title?: string | null; starts_at?: string | null } | { full_name?: string | null; title?: string | null; starts_at?: string | null }[] | null;
const one = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] || null : value || null;

export default async function HandoffPage() {
  const profile = await requireProfile();
  if (profile.role !== "nurse") redirect("/portal");
  const supabase = await createClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dt = (v: string | null | undefined) => formatDateTime(v, profile.facility.locale, profile.facility.timezone);
  const tm = (v: string | null | undefined) => formatTime(v, profile.facility.locale, profile.facility.timezone);

  const [permissionsQ, visitsQ, dischargesQ, tasksQ, activityUpdatesQ, doctorAbsencesQ] = await Promise.all([
    supabase.from("permission_requests").select("id,status,departure_at,return_at,patient:profiles!permission_requests_patient_id_fkey(full_name)").in("status", ["waiting", "submitted", "approved", "departed"]).order("departure_at").limit(40),
    supabase.from("visit_notifications").select("id,status,scheduled_start,scheduled_end,visitor_one_name,patient:profiles!visit_notifications_patient_id_fkey(full_name)").gte("scheduled_start", now.toISOString()).lte("scheduled_start", in24h.toISOString()).order("scheduled_start").limit(30),
    supabase.rpc("discharge_planning_board"),
    supabase.from("operational_tasks").select("id,title,assigned_role,due_at,status,patient:profiles!operational_tasks_patient_id_fkey(full_name)").eq("status", "pending").eq("assigned_role", "nurse").order("due_at", { ascending: true, nullsFirst: false }).limit(30),
    supabase.from("activity_updates").select("id,update_type,message,created_at,activity:activities(title,starts_at)").gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(10),
    supabase.from("doctor_absences").select("id,starts_at,ends_at,reason,doctor:care_team_directory!doctor_absences_doctor_id_fkey(full_name),replacement:care_team_directory!doctor_absences_replacement_doctor_id_fkey(full_name)").gte("ends_at", now.toISOString()).lte("starts_at", in24h.toISOString()).order("starts_at").limit(10),
  ]);

  const permissions = permissionsQ.data || [];
  const lateReturns = permissions.filter((p) => p.status === "departed" && new Date(p.return_at).getTime() < now.getTime());
  const departures = permissions.filter((p) => p.status === "approved" && new Date(p.departure_at).getTime() <= in24h.getTime());
  const waiting = permissions.filter((p) => ["waiting", "submitted"].includes(p.status));
  const visits = visitsQ.data || [];
  const discharges = ((dischargesQ.data || []) as { stay_id: string; patient_name: string; room_number: string | null; planned_discharge_at: string | null }[])
    .filter((d) => d.planned_discharge_at && new Date(d.planned_discharge_at).getTime() <= in24h.getTime());
  const tasks = tasksQ.data || [];
  const updates = activityUpdatesQ.data || [];
  const absences = doctorAbsencesQ.data || [];
  const attention = lateReturns.length + waiting.length + tasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now.getTime()).length;

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Relève infirmière</div><h1>Prendre le service en 60 secondes</h1><p>Retards, mouvements, sorties et changements importants des prochaines 24 heures.</p></div><Link className="button button-secondary" href="/portal/pulse">Ouvrir Pulse</Link></div>
    <section className="handoff-summary-grid"><article><strong>{attention}</strong><span>À surveiller</span><small>retards, validations, tâches</small></article><article><strong>{departures.length}</strong><span>Départs autorisés</span><small>prochaines 24 h</small></article><article><strong>{visits.length}</strong><span>Visites prévues</span><small>information de service</small></article><article><strong>{discharges.length}</strong><span>Sorties définitives</span><small>à préparer</small></article></section>
    <section className="handoff-grid">
      <article className="work-card work-card--priority"><div className="work-card-head"><div><p className="section-kicker">Priorités</p><h2>À connaître maintenant</h2></div><span className="count-pill">{lateReturns.length + waiting.length}</span></div><div className="work-card-body">{lateReturns.map((p) => { const patient = one(p.patient as Rel); return <div className="record-row" key={`late-${p.id}`}><div><strong>Retour en retard · {patient?.full_name || "Patient"}</strong><small>Retour attendu à {tm(p.return_at)}</small></div><Link className="text-link" href="/portal/permissions">Voir →</Link></div>; })}{waiting.slice(0, 5).map((p) => { const patient = one(p.patient as Rel); return <div className="record-row" key={`wait-${p.id}`}><div><strong>Permission en attente · {patient?.full_name || "Patient"}</strong><small>Départ souhaité {dt(p.departure_at)}</small></div></div>; })}{!lateReturns.length && !waiting.length && <p className="empty">Aucun point critique.</p>}</div></article>
      <article className="work-card"><div className="work-card-head"><div><p className="section-kicker">Sorties</p><h2>À préparer</h2></div><Link className="text-link" href="/portal/discharges">Planning →</Link></div><div className="work-card-body">{discharges.length ? discharges.map((d) => <div className="record-row" key={d.stay_id}><div><strong>{d.patient_name}</strong><small>Chambre {d.room_number || "—"} · {dt(d.planned_discharge_at)}</small></div><span className="badge badge-warning">À préparer</span></div>) : <p className="empty">Aucune sortie dans les prochaines 24 h.</p>}</div></article>
      <article className="work-card"><div className="work-card-head"><div><p className="section-kicker">Mes tâches</p><h2>Coordination de sortie</h2></div><span className="count-pill">{tasks.length}</span></div><div className="work-card-body">{tasks.length ? tasks.slice(0, 8).map((task) => { const patient = one(task.patient as Rel); return <div className="record-row" key={task.id}><div><strong>{task.title}</strong><small>{patient?.full_name || "Patient"} · {task.due_at ? dt(task.due_at) : "Sans échéance"}</small></div><OperationalTaskButton taskId={task.id} /></div>; }) : <p className="empty">Aucune tâche infirmière en attente.</p>}</div></article>
      <article className="work-card"><div className="work-card-head"><div><p className="section-kicker">Changements</p><h2>Ce qui a bougé</h2></div></div><div className="work-card-body">{absences.map((row) => { const doctor = one(row.doctor as Rel); const replacement = one(row.replacement as Rel); return <div className="record-row" key={row.id}><div><strong>Absence médecin · {doctor?.full_name || "Médecin"}</strong><small>{dt(row.starts_at)} → {dt(row.ends_at)}{replacement?.full_name ? ` · Relais ${replacement.full_name}` : ""}</small></div></div>; })}{updates.map((row) => { const activity = one(row.activity as Rel); return <div className="record-row" key={row.id}><div><strong>{row.update_type === "absence" ? "Activité annulée" : row.update_type === "change" ? "Activité modifiée" : "Information activité"} · {activity?.title || "Activité"}</strong><small>{row.message}</small></div></div>; })}{!absences.length && !updates.length && <p className="empty">Aucun changement récent.</p>}</div></article>
    </section>
  </PortalShell>;
}
