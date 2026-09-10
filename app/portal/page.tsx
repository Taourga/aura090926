import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";
import { permissionLabels, roleLabels } from "@/lib/types";
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
    const patientFloor = Number.parseInt(profile.activeStay?.room_number?.slice(0, 1) || "", 10);
    const [{ data: appointments }, { data: permissions }, { data: enrollments }, { count: informationCount }, { data: doctorRounds }] = await Promise.all([
      supabase.from("appointments").select("id, title, starts_at, ends_at, location").eq("patient_id", profile.id).gte("ends_at", new Date().toISOString()).order("starts_at").limit(1),
      supabase.from("permission_requests").select("id, departure_at, return_at, status").eq("patient_id", profile.id).gte("return_at", new Date().toISOString()).order("departure_at").limit(1),
      supabase.from("activity_enrollments").select("activity:activities(title, starts_at, location)").eq("patient_id", profile.id).limit(1),
      supabase.from("information_posts").select("id", { count: "exact", head: true }).eq("published", true),
      Number.isNaN(patientFloor)
        ? Promise.resolve({ data: [] as { id: string; scheduled_at: string }[] })
        : supabase.from("doctor_rounds").select("id, scheduled_at").eq("floor_number", patientFloor).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1),
    ]);
    const nextAppointment = appointments?.[0];
    const nextPermission = permissions?.[0];
    const activityRelation = enrollments?.[0]?.activity as { title: string; starts_at: string; location: string | null } | { title: string; starts_at: string; location: string | null }[] | null | undefined;
    const nextActivity = Array.isArray(activityRelation) ? activityRelation[0] : activityRelation;
    const doctorRound = doctorRounds?.[0];

    return <PortalShell profile={profile}>
      <div className="page-intro"><div><h1>Bonjour, {profile.full_name.split(" ")[0]}</h1><p>Vos informations essentielles, en un coup d’œil.</p></div><Link className="button button-primary" href="/portal/permissions">Demander une permission</Link></div>
      <section className="summary-link-grid" aria-label="Raccourcis de séjour">
        <Link href="/portal/appointments" className="summary-link"><span>Rendez-vous</span><strong>{nextAppointment ? formatTime(nextAppointment.starts_at) : "Aucun"}</strong><small>{nextAppointment ? nextAppointment.title : "Voir mon planning"}</small></Link>
        <Link href="/portal/activities" className="summary-link"><span>Activités</span><strong>{nextActivity ? "À venir" : "Aucune"}</strong><small>{nextActivity ? nextActivity.title : "Voir les ateliers"}</small></Link>
        <Link href="/portal/permissions" className="summary-link"><span>Permissions</span><strong>{nextPermission ? permissionLabels[nextPermission.status as keyof typeof permissionLabels] : "Aucune"}</strong><small>{nextPermission ? `Prévue ${formatDateTime(nextPermission.departure_at)}` : "Faire une demande"}</small></Link>
        <Link href="/portal/activities?section=sport" className="summary-link"><span>Salle de sport</span><strong>9 h – 12 h</strong><small>Voir le planning</small></Link>
        <Link href="/portal/information" className="summary-link"><span>Informations</span><strong>{informationCount || 0}</strong><small>Voir les messages et menus</small></Link>
      </section>
      {doctorRound && <Link className="overview-note" href="/portal/appointments"><strong>Passage du médecin</strong><span>Prévu le {formatDateTime(doctorRound.scheduled_at)} dans votre étage.</span></Link>}
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
  const firstName = profile.full_name.split(" ")[0];
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Bonjour, {firstName}</h1><p>Vue opérationnelle · {roleLabels[profile.role]}</p></div><Link className="button button-primary" href={profile.role === "admin" ? "/portal/admin" : "/portal/permissions"}>{profile.role === "admin" ? "Gérer la plateforme" : "Voir les permissions"}</Link></div>
    <div className="metric-grid"><div className="metric"><span>Décisions à traiter</span><strong>{pendingCount || 0}</strong><div className="metric-detail">Permissions en attente</div></div><div className="metric"><span>Permissions autorisées</span><strong>{approvedCount || 0}</strong><div className="metric-detail">À venir ou à enregistrer</div></div><div className="metric"><span>Patients absents</span><strong>{departedCount || 0}</strong><div className="metric-detail">Retour non enregistré</div></div><div className="metric"><span>Rendez-vous à venir</span><strong>{upcomingAppointments?.length || 0}</strong><div className="metric-detail">Prochains créneaux</div></div></div>
    <section className="card"><div className="card-header"><div><h2>Prochains rendez-vous</h2><p className="card-subtitle">Planning à venir des patients</p></div></div><div className="card-body"><div className="list">{upcomingAppointments?.length ? upcomingAppointments.map((item) => { const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient; return <div className="list-row" key={item.id}><div className="time">{formatTime(item.starts_at)}</div><div><div className="row-title">{item.title}</div><div className="row-meta">{patient?.full_name || "Patient"} · {item.location || "Lieu à confirmer"}</div></div><span className="badge badge-info">Prévu</span></div>; }) : <p className="empty">Aucun rendez-vous à venir.</p>}</div></div></section>
  </PortalShell>;
}
