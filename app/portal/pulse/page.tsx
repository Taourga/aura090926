import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { PermissionDecisionActions, MovementActions } from "@/components/permission-actions";
import { VisitMovementActions } from "@/components/visit-actions";
import { PulseQuickMessage } from "@/components/pulse-quick-message";
import { appointmentRoles, facilityFeatureEnabled, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";
import { parisDate, type HousekeepingData } from "@/lib/housekeeping";

export const dynamic = "force-dynamic";

type Rel = { full_name: string | null } | { full_name: string | null }[] | null;
type Stay = { id: string; patient_id: string; presence: string | null; room_number: string | null; patient: Rel };
type Permission = { id: string; patient_id: string; departure_at: string; return_at: string; status: string; doctor_decision: string | null; manager_decision: string | null; patient: Rel };
type Appointment = { id: string; patient_id: string; title: string; starts_at: string; location: string | null; patient: Rel };
type Visit = { id: string; patient_id: string; scheduled_start: string; status: string; visitor_one_name: string; patient: Rel };
type Contact = { id: string; full_name: string; role: string };
type UnreadMessage = { id: string; sender_id: string; body: string; priority: number; created_at: string; sender: Rel };
type Discharge = { stay_id: string; patient_name: string; room_number: string | null; planned_discharge_at: string | null };

const allowed = ["doctor", "manager", "nurse", "reception", "admin", "governance", "technical"];
const messagingRoles = ["doctor", "nurse", "manager", "governance"];
const nameOf = (rel: Rel) => (Array.isArray(rel) ? rel[0]?.full_name : rel?.full_name) || "Patient";

export default async function PulsePage() {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");

  const supabase = await createClient();
  const now = new Date();
  const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const today = parisDate(now, profile.facility.timezone);
  const showVisits = facilityFeatureEnabled(profile, "visits");
  const canOpenVisits = profile.role === "reception" && showVisits;
  const canOpenAppointments = appointmentRoles.includes(profile.role);
  const canMessage = messagingRoles.includes(profile.role) && facilityFeatureEnabled(profile, "messaging");
  const dt = (v: string) => formatDateTime(v, profile.facility.locale, profile.facility.timezone);
  const tm = (v: string) => formatTime(v, profile.facility.locale, profile.facility.timezone);

  const [staysQ, permsQ, apptsQ, visitsQ, dischargesQ] = await Promise.all([
    supabase.from("patient_stays").select("id,patient_id,presence,room_number,patient:profiles!patient_stays_patient_id_fkey(full_name)").is("ended_at", null).order("room_number").limit(200),
    supabase.from("permission_requests").select("id,patient_id,departure_at,return_at,status,doctor_decision,manager_decision,patient:profiles!permission_requests_patient_id_fkey(full_name)").in("status", ["submitted", "waiting", "approved", "departed"]).order("departure_at").limit(50),
    supabase.from("appointments").select("id,patient_id,title,starts_at,location,patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at", now.toISOString()).lte("starts_at", in36h.toISOString()).order("starts_at").limit(20),
    showVisits ? supabase.from("visit_notifications").select("id,patient_id,scheduled_start,status,visitor_one_name,patient:profiles!visit_notifications_patient_id_fkey(full_name)").gte("scheduled_start", `${today}T00:00:00`).lte("scheduled_start", `${today}T23:59:59`).order("scheduled_start").limit(20) : Promise.resolve({ data: [] }),
    supabase.rpc("discharge_planning_board"),
  ]);

  let contacts: Contact[] = [];
  let unreadMessages: UnreadMessage[] = [];
  if (canMessage) {
    const [contactsQ, unreadQ] = await Promise.all([
      supabase.rpc("clinical_message_contacts"),
      supabase.from("clinical_messages").select("id,sender_id,body,priority,created_at,sender:profiles!clinical_messages_sender_id_fkey(full_name)").eq("recipient_id", profile.id).is("read_at", null).order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    ]);
    contacts = (contactsQ.data || []) as Contact[];
    unreadMessages = (unreadQ.data || []) as unknown as UnreadMessage[];
  }

  const stays = (staysQ.data || []) as unknown as Stay[];
  const permissions = (permsQ.data || []) as unknown as Permission[];
  const appointments = (apptsQ.data || []) as unknown as Appointment[];
  const visits = (visitsQ.data || []) as unknown as Visit[];
  const discharges = (dischargesQ.data || []) as Discharge[];
  const patientByStay = new Map(stays.map((stay) => [stay.id, stay.patient_id]));
  const waiting = permissions.filter((p) => ["submitted", "waiting"].includes(p.status));
  const approved = permissions.filter((p) => p.status === "approved");
  const departed = permissions.filter((p) => p.status === "departed");
  const onSite = visits.filter((v) => v.status === "arrived");
  const late = departed.filter((p) => new Date(p.return_at).getTime() < now.getTime());
  const highPriorityUnread = unreadMessages.filter((m) => m.priority >= 2);
  const plannedDischarges = discharges.filter((d) => d.planned_discharge_at).slice(0, 4);

  let housekeeping: HousekeepingData | null = null;
  if (["governance", "technical", "admin"].includes(profile.role) && facilityFeatureEnabled(profile, "housekeeping")) {
    const { data } = await supabase.rpc("housekeeping_dashboard", { p_date: today });
    housekeeping = data as HousekeepingData | null;
  }
  const hkTotal = housekeeping?.tasks.length || 0;
  const hkDone = housekeeping?.tasks.filter((t) => !!t.completed_at).length || 0;
  const hkPct = hkTotal ? Math.round((hkDone / hkTotal) * 100) : 0;
  const attentionCount = late.length + waiting.length + highPriorityUnread.length;

  const presence = (value: string | null) => value === "out" ? "Sorti" : value === "appointment" ? "En rendez-vous" : "Présent";
  const permissionLabel = (status: string) => status === "approved" ? "Validée" : status === "departed" ? "Sorti" : "En attente";

  return <PortalShell profile={profile}>
    <div className="pulse-head"><div><div className="pulse-kicker">Tour de contrôle de la journée</div><h1>AURA Pulse</h1><p>Voir, comprendre et agir sans chercher l’information dans plusieurs écrans.</p></div><div className="pulse-live"><span />En temps réel</div></div>

    <section className="pulse-metrics">
      <Link href="/portal/discharges" className="pulse-metric"><b>◎</b><div><strong>{stays.length}</strong><span>Patients actifs</span><small>{stays.filter((s) => s.presence !== "out").length} présents</small></div></Link>
      <Link href="/portal/permissions" className="pulse-metric"><b>✓</b><div><strong>{waiting.length}</strong><span>Permissions à traiter</span><small>{approved.length} autorisées</small></div></Link>
      {canOpenAppointments ? <Link href="/portal/appointments" className="pulse-metric"><b>◷</b><div><strong>{appointments.length}</strong><span>Rendez-vous à venir</span><small>Prochaines 36 h</small></div></Link> : <div className="pulse-metric"><b>◷</b><div><strong>{appointments.length}</strong><span>Rendez-vous à venir</span><small>Prochaines 36 h</small></div></div>}
      {canOpenVisits ? <Link href="/portal/visits" className="pulse-metric"><b>♧</b><div><strong>{onSite.length}</strong><span>Visiteurs sur site</span><small>{visits.length} aujourd’hui</small></div></Link> : <div className="pulse-metric"><b>♧</b><div><strong>{onSite.length}</strong><span>Visiteurs sur site</span><small>{visits.length} aujourd’hui</small></div></div>}
      <a href="#points-attention" className="pulse-metric pulse-metric-alert"><b>!</b><div><strong>{attentionCount}</strong><span>Points d’attention</span><small>{late.length ? `${late.length} retour en retard` : highPriorityUnread.length ? `${highPriorityUnread.length} message important` : "Sous contrôle"}</small></div></a>
    </section>

    <section className="pulse-grid">
      <article className="pulse-card"><header><div><h2>◎ Patients</h2><p>{stays.length} séjours actifs</p></div><Link href="/portal/discharges">Préparer les sorties →</Link></header><div>{stays.slice(0, 6).map((s) => <Link className="pulse-row pulse-row-link" href={`/portal/discharges?patient=${s.patient_id}`} key={s.id}><div><strong>{nameOf(s.patient)}</strong><small>Chambre {s.room_number || "—"}</small></div><em>{presence(s.presence)}</em></Link>)}</div></article>

      <article className="pulse-card"><header><div><h2>✓ Permissions</h2><p>{permissions.length} demandes actives</p></div><Link href="/portal/permissions">Voir toutes →</Link></header><div>{permissions.slice(0, 6).map((p) => {
        const canReview = (profile.role === "doctor" && !p.doctor_decision) || (profile.role === "manager" && !p.manager_decision);
        const movement = profile.role === "reception" && (p.status === "approved" || p.status === "departed") ? (p.status === "approved" ? "depart" : "return") : null;
        return <div className="pulse-action-row" key={p.id}><div className="pulse-row"><div><strong>{nameOf(p.patient)}</strong><small>{dt(p.departure_at)}</small></div><em>{permissionLabel(p.status)}</em></div>{canReview ? <PermissionDecisionActions permissionId={p.id} /> : movement ? <MovementActions permissionId={p.id} action={movement} /> : <Link className="pulse-inline-link" href={`/portal/permissions?patient=${p.patient_id}`}>Ouvrir →</Link>}</div>;
      })}</div></article>

      <article className="pulse-card"><header><div><h2>◷ Rendez-vous</h2><p>{appointments.length} prochains créneaux</p></div>{canOpenAppointments && <Link href="/portal/appointments">Planning →</Link>}</header><div>{appointments.slice(0, 6).map((a) => canOpenAppointments ? <Link href={`/portal/appointments?patient=${a.patient_id}`} className="pulse-time pulse-row-link" key={a.id}><time>{tm(a.starts_at)}</time><div><strong>{nameOf(a.patient)}</strong><small>{a.title}{a.location ? ` · ${a.location}` : ""}</small></div></Link> : <div className="pulse-time" key={a.id}><time>{tm(a.starts_at)}</time><div><strong>{nameOf(a.patient)}</strong><small>{a.title}{a.location ? ` · ${a.location}` : ""}</small></div></div>)}</div></article>

      <article className="pulse-card"><header><div><h2>♧ Visites</h2><p>{visits.length} aujourd’hui</p></div>{canOpenVisits && <Link href="/portal/visits">Voir toutes →</Link>}</header><div>{visits.length ? visits.slice(0, 6).map((v) => <div className="pulse-action-row" key={v.id}><div className="pulse-row"><div><strong>{v.visitor_one_name}</strong><small>{nameOf(v.patient)} · {tm(v.scheduled_start)}</small></div><em>{v.status === "arrived" ? "Sur site" : v.status === "departed" ? "Terminée" : "À venir"}</em></div>{profile.role === "reception" && (v.status === "scheduled" || v.status === "arrived") ? <VisitMovementActions visitId={v.id} action={v.status === "scheduled" ? "arrive" : "depart"} /> : canOpenVisits ? <Link className="pulse-inline-link" href={`/portal/visits?patient=${v.patient_id}`}>Ouvrir →</Link> : null}</div>) : <p className="pulse-empty">Aucune visite aujourd’hui.</p>}</div></article>

      <article className="pulse-card" id="points-attention"><header><div><h2>! Points d’attention</h2><p>Accès direct aux écrans concernés</p></div></header><div>
        {late.map((p) => <div className="pulse-alert" key={`late-${p.id}`}><i className="danger" /><div><strong>Retour en retard · {nameOf(p.patient)}</strong><small>Retour prévu {tm(p.return_at)}</small></div><Link href={`/portal/permissions?patient=${p.patient_id}`}>Traiter →</Link></div>)}
        {waiting.slice(0, 3).map((p) => <div className="pulse-alert" key={`waiting-${p.id}`}><i className="warning" /><div><strong>Permission à traiter · {nameOf(p.patient)}</strong><small>{dt(p.departure_at)}</small></div><Link href={`/portal/permissions?patient=${p.patient_id}`}>Traiter →</Link></div>)}
        {highPriorityUnread.map((m) => <div className="pulse-alert" key={`message-${m.id}`}><i className={m.priority === 3 ? "danger" : "warning"} /><div><strong>Message niveau {m.priority} · {nameOf(m.sender)}</strong><small>{m.body.slice(0, 80)}</small></div><Link href={`/portal/messages?contact=${m.sender_id}`}>Lire →</Link></div>)}
        {!late.length && !waiting.length && !highPriorityUnread.length && <div className="pulse-ok"><b>✓</b><div><strong>Tout est sous contrôle</strong><small>Aucun point critique détecté.</small></div></div>}
      </div></article>

      <article className="pulse-card"><header><div><h2>{housekeeping ? "◇ Tâches du jour" : "⇥ Sorties prévues"}</h2><p>{housekeeping ? "Hôtellerie & exploitation" : "Anticipation des fins d’hospitalisation"}</p></div><Link href={housekeeping ? "/portal/housekeeping" : "/portal/discharges"}>{housekeeping ? "Hôtellerie" : "Planning"} →</Link></header>{housekeeping ? <div><div className="pulse-progress-copy"><strong>{hkDone} / {hkTotal}</strong><span>{hkPct}% terminé</span></div><div className="pulse-progress"><span style={{ width: `${hkPct}%` }} /></div>{housekeeping.tasks.filter((t) => !t.completed_at).slice(0, 4).map((t) => <div className="pulse-row" key={t.id}><div><strong>{t.target}</strong><small>{t.period}</small></div><em>À faire</em></div>)}</div> : <div>{plannedDischarges.length ? plannedDischarges.map((d) => { const patientId = patientByStay.get(d.stay_id); return <Link href={patientId ? `/portal/discharges?patient=${patientId}` : "/portal/discharges"} className="pulse-row pulse-row-link" key={d.stay_id}><div><strong>{d.patient_name}</strong><small>Chambre {d.room_number || "—"}</small></div><em>{d.planned_discharge_at ? dt(d.planned_discharge_at) : ""}</em></Link>; }) : <p className="pulse-empty">Aucune sortie planifiée.</p>}</div>}</article>
    </section>

    {canMessage && <section className="pulse-message-card"><div className="pulse-message-head"><div><h2>✉ Message rapide</h2><p>Contactez un médecin, infirmier, cadre ou membre de la gouvernance sans quitter Pulse.</p></div><Link href="/portal/messages">Messagerie complète →</Link></div><PulseQuickMessage contacts={contacts} /></section>}

    <section className="pulse-brief"><div><b>✦</b><span><strong>Briefing de la journée</strong><small>Généré automatiquement à partir des flux AURA</small></span></div><div className="pulse-brief-items"><span><strong>{late.length}</strong> retour attendu</span><span><strong>{appointments.length}</strong> rendez-vous</span><span><strong>{waiting.length}</strong> permissions</span><span><strong>{plannedDischarges.length}</strong> sorties prévues</span>{canMessage && <span><strong>{unreadMessages.length}</strong> messages non lus</span>}</div></section>
  </PortalShell>;
}