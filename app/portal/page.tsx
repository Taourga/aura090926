import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";
import { roleLabels, type PermissionStatus } from "@/lib/types";
import {
  StaffDashboard,
  type DoctorRound,
  type DoctorScheduleBlock,
  type OperationalRole,
  type StaffAppointment,
  type StaffPermission,
  type StaffStay,
} from "@/components/staff-dashboard";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (profile.role === "patient") {
    const [{ data: appointments }, { data: permissions }, { data: enrollments }, { data: posts }, { data: doctorRounds }] = await Promise.all([
      supabase.from("appointments").select("id, title, starts_at, ends_at, location").eq("patient_id", profile.id).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
      supabase.from("permission_requests").select("id, departure_at, return_at, status").eq("patient_id", profile.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("activity_enrollments").select("activity:activities(title, starts_at, location)").eq("patient_id", profile.id).limit(3),
      supabase.from("information_posts").select("id, title, body").eq("published", true).order("created_at", { ascending: false }).limit(2),
      supabase.from("doctor_rounds").select("id, floor_number, scheduled_at").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(2),
    ]);
    return <PortalShell profile={profile}>
      <div className="page-intro"><div><h1>Bonjour, {profile.full_name.split(" ")[0]}</h1><p>Voici les éléments importants de votre séjour.</p></div><Link className="button button-primary" href="/portal/permissions">Demander une sortie</Link></div>
      <div className="metric-grid"><div className="metric"><span>Prochain rendez-vous</span><strong>{appointments?.[0] ? formatTime(appointments[0].starts_at) : "—"}</strong><div className="metric-detail">{appointments?.[0]?.title || "Aucun rendez-vous à venir"}</div></div><div className="metric"><span>Activités inscrites</span><strong>{enrollments?.length || 0}</strong><div className="metric-detail">Voir mon planning</div></div><div className="metric"><span>Permissions</span><strong>{permissions?.filter((item) => item.status === "approved").length || 0}</strong><div className="metric-detail">Sorties autorisées</div></div><div className="metric"><span>Informations</span><strong>{posts?.length || 0}</strong><div className="metric-detail">Nouveautés de la clinique</div></div></div>
      <div className="dashboard-grid"><div className="stack"><section className="card"><div className="card-header"><div><h2>Mon planning</h2><p className="card-subtitle">Vos prochains rendez-vous</p></div><Link className="button button-secondary button-small" href="/portal/activities">Activités</Link></div><div className="card-body"><div className="list">{appointments?.length ? appointments.map((item) => <div className="list-row" key={item.id}><div className="time">{formatTime(item.starts_at)}</div><div><div className="row-title">{item.title}</div><div className="row-meta">{item.location || "Lieu à confirmer"}</div></div><span className="badge badge-info">Rendez-vous</span></div>) : <p className="empty">Aucun rendez-vous planifié pour le moment.</p>}</div></div></section><section className="card"><div className="card-header"><div><h2>Mes permissions</h2><p className="card-subtitle">Suivi de vos dernières demandes</p></div><Link className="button button-secondary button-small" href="/portal/permissions">Gérer</Link></div><div className="card-body"><div className="list">{permissions?.length ? permissions.map((item) => <div className="list-row" key={item.id}><div className="time">{formatTime(item.departure_at)}</div><div><div className="row-title">Sortie prévue le {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(item.departure_at))}</div><div className="row-meta">Retour prévu : {formatDateTime(item.return_at)}</div></div><StatusBadge status={item.status as PermissionStatus} /></div>) : <p className="empty">Vous n&apos;avez pas encore demandé de permission.</p>}</div></div></section></div><aside className="stack"><section className="card doctor-passage-card"><div className="card-header"><div><h2>Passage du médecin</h2><p className="card-subtitle">Information transmise pour votre étage.</p></div></div><div className="card-body"><div className="list">{doctorRounds?.length ? doctorRounds.map((round) => <div className="passage-row" key={round.id}><span className="passage-icon" aria-hidden="true">+</span><div><strong>Passage prévu le {formatDateTime(round.scheduled_at)}</strong><p>Le médecin passera dans votre étage à cet horaire.</p></div></div>) : <p className="empty">Aucun horaire de passage communiqué pour le moment.</p>}</div></div></section><section className="card"><div className="card-header"><div><h2>À savoir</h2><p className="card-subtitle">Informations de la clinique</p></div><Link className="button button-secondary button-small" href="/portal/information">Tout voir</Link></div><div className="card-body"><div className="list">{posts?.length ? posts.map((post) => <div className="list-row" key={post.id} style={{ gridTemplateColumns: "1fr" }}><div><div className="row-title">{post.title}</div><div className="row-meta">{post.body}</div></div></div>) : <p className="empty">Aucune information nouvelle.</p>}</div></div></section></aside></div>
    </PortalShell>;
  }

  if (profile.role === "doctor") {
    const [{ data: permissions }, { data: stays }, { data: appointments }, { data: doctorRounds }, { data: externalAppointments }] = await Promise.all([
      supabase.from("permission_requests").select("id, departure_at, return_at, reason, status, doctor_decision, manager_decision, departed_at, returned_at, patient:profiles!permission_requests_patient_id_fkey(full_name, phone)").in("status", ["submitted", "waiting", "approved", "departed"]).order("departure_at").limit(50),
      supabase.from("patient_stays").select("id, presence, room_number, ward:wards(name, floor), patient:profiles!patient_stays_patient_id_fkey(full_name, phone)").is("ended_at", null).order("room_number").limit(100),
      supabase.from("appointments").select("id, title, starts_at, location, patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at", new Date().toISOString()).order("starts_at").limit(12),
      supabase.from("doctor_rounds").select("id, floor_number, scheduled_at").eq("doctor_id", profile.id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(8),
      supabase.from("doctor_schedule_blocks").select("id, starts_at, ends_at").eq("doctor_id", profile.id).gte("ends_at", new Date().toISOString()).order("starts_at").limit(12),
    ]);
    return <PortalShell profile={profile}><StaffDashboard role="doctor" firstName={profile.full_name.split(" ")[0]} permissions={(permissions || []) as StaffPermission[]} stays={(stays || []) as StaffStay[]} appointments={(appointments || []) as StaffAppointment[]} doctorRounds={(doctorRounds || []) as DoctorRound[]} externalAppointments={(externalAppointments || []) as DoctorScheduleBlock[]} /></PortalShell>;
  }

  const operationalRoles: OperationalRole[] = ["manager", "nurse", "reception"];

  if (operationalRoles.includes(profile.role as OperationalRole)) {
    const role = profile.role as OperationalRole;
    const [{ data: permissions }, { data: stays }, { data: appointments }] = await Promise.all([
      supabase.from("permission_requests").select("id, departure_at, return_at, reason, status, doctor_decision, manager_decision, departed_at, returned_at, patient:profiles!permission_requests_patient_id_fkey(full_name, phone)").in("status", ["submitted", "waiting", "approved", "departed"]).order("departure_at").limit(50),
      supabase.from("patient_stays").select("id, presence, room_number, ward:wards(name, floor), patient:profiles!patient_stays_patient_id_fkey(full_name, phone)").is("ended_at", null).order("room_number").limit(100),
      supabase.from("appointments").select("id, title, starts_at, location, patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at", new Date().toISOString()).order("starts_at").limit(12),
    ]);
    return <PortalShell profile={profile}><StaffDashboard role={role} firstName={profile.full_name.split(" ")[0]} permissions={(permissions || []) as StaffPermission[]} stays={(stays || []) as StaffStay[]} appointments={(appointments || []) as StaffAppointment[]} /></PortalShell>;
  }

  const [{ count: pendingCount }, { count: approvedCount }, { count: departedCount }, { data: upcomingAppointments }] = await Promise.all([
    supabase.from("permission_requests").select("*", { count: "exact", head: true }).in("status", ["submitted", "waiting"]),
    supabase.from("permission_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("permission_requests").select("*", { count: "exact", head: true }).eq("status", "departed"),
    supabase.from("appointments").select("id, title, starts_at, location, patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at", new Date().toISOString()).order("starts_at").limit(6),
  ]);
  const { data: currentStays } = profile.role === "reception"
    ? await supabase.from("patient_stays").select("id, presence, ward:wards(name, floor)").is("ended_at", null)
    : { data: [] as { id: string; presence: string; ward: { name: string; floor: string | null } | null }[] };
  const presentStays = (currentStays || []).filter((stay) => stay.presence === "present");
  const floorTotals = presentStays.reduce<Record<string, number>>((totals, stay) => {
    const ward = Array.isArray(stay.ward) ? stay.ward[0] : stay.ward;
    const floor = ward?.floor || "Étage non renseigné";
    totals[floor] = (totals[floor] || 0) + 1;
    return totals;
  }, {});
  const firstName = profile.full_name.split(" ")[0];
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Bonjour, {firstName}</h1><p>Vue opérationnelle · {roleLabels[profile.role]}</p></div><Link className="button button-primary" href={profile.role === "admin" ? "/portal/admin" : "/portal/permissions"}>{profile.role === "admin" ? "Gérer la plateforme" : "Voir les permissions"}</Link></div>
    <div className="metric-grid"><div className="metric"><span>Décisions à traiter</span><strong>{pendingCount || 0}</strong><div className="metric-detail">Permissions en attente</div></div><div className="metric"><span>Sorties autorisées</span><strong>{approvedCount || 0}</strong><div className="metric-detail">À venir ou à enregistrer</div></div><div className="metric"><span>Patients sortis</span><strong>{departedCount || 0}</strong><div className="metric-detail">Retour non enregistré</div></div><div className="metric"><span>{profile.role === "reception" ? "Patients présents" : "Rendez-vous à venir"}</span><strong>{profile.role === "reception" ? presentStays.length : upcomingAppointments?.length || 0}</strong><div className="metric-detail">{profile.role === "reception" ? `${Object.keys(floorTotals).length} étage(s) renseigné(s)` : "Prochains créneaux"}</div></div></div>
    <div className="dashboard-grid"><section className="card"><div className="card-header"><div><h2>Prochains rendez-vous</h2><p className="card-subtitle">Planning à venir des patients</p></div>{["doctor", "manager", "psychologist", "provider"].includes(profile.role) && <Link className="button button-secondary button-small" href="/portal/appointments">Planifier</Link>}</div><div className="card-body"><div className="list">{upcomingAppointments?.length ? upcomingAppointments.map((item) => { const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient; return <div className="list-row" key={item.id}><div className="time">{formatTime(item.starts_at)}</div><div><div className="row-title">{item.title}</div><div className="row-meta">{patient?.full_name || "Patient"} · {item.location || "Lieu à confirmer"}</div></div><span className="badge badge-info">Prévu</span></div>; }) : <p className="empty">Aucun rendez-vous à venir.</p>}</div></div></section><aside className="card"><div className="card-header"><div><h2>Accès rapide</h2><p className="card-subtitle">Selon votre rôle</p></div></div><div className="card-body"><div className="section-actions"><Link className="button button-secondary button-small" href="/portal/permissions">Permissions</Link><Link className="button button-secondary button-small" href="/portal/information">Informations</Link>{profile.role === "admin" && <Link className="button button-secondary button-small" href="/portal/admin">Utilisateurs</Link>}</div><p className="notice" style={{ marginTop: 16 }}>Les décisions, mouvements et modifications sont tracés dans l&apos;historique de la plateforme.</p></div></aside></div>
    {profile.role === "reception" && <section className="card" style={{ marginTop: 18 }}><div className="card-header"><div><h2>Présence en temps réel</h2><p className="card-subtitle">Patients actuellement marqués présents, par étage.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Étage</th><th>Patients présents</th></tr></thead><tbody>{Object.keys(floorTotals).length ? Object.entries(floorTotals).map(([floor, total]) => <tr key={floor}><td><strong>{floor}</strong></td><td>{total}</td></tr>) : <tr><td className="empty" colSpan={2}>Aucun séjour actif renseigné.</td></tr>}</tbody></table></div></section>}
  </PortalShell>;
}
