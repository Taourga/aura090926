import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { PermissionForm } from "@/components/permission-form";
import { facilityFeatureEnabled, facilitySettingNumber, requireProfile } from "@/lib/auth";
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

const quotePool = [
  "Avancer doucement, c’est quand même avancer.",
  "Aujourd’hui mérite d’être vécu un pas après l’autre.",
  "Prendre soin de soi est déjà une victoire.",
  "Chaque journée peut contenir un petit progrès.",
  "Vous n’avez pas besoin de tout réussir aujourd’hui, seulement de continuer.",
  "Le calme revient souvent par petites étapes.",
  "Votre rythme compte autant que votre destination.",
];

function localParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

function nextDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10);
}

export default async function PortalPage() {
  const profile = await requireProfile();
  if (profile.role === "trusted_contact") redirect("/portal/proche");
  if ((profile.role === "governance" || profile.role === "technical") && facilityFeatureEnabled(profile, "housekeeping")) redirect("/portal/housekeeping");
  const supabase = await createClient();
  const displayDateTime = (value: string | null | undefined) => formatDateTime(value, profile.facility.locale, profile.facility.timezone);
  const displayTime = (value: string | null | undefined) => formatTime(value, profile.facility.locale, profile.facility.timezone);

  if (profile.role === "patient") {
    const showPermissions = facilityFeatureEnabled(profile, "permissions");
    const showActivities = facilityFeatureEnabled(profile, "activities");
    const showVisits = facilityFeatureEnabled(profile, "visits");
    const showInformation = facilityFeatureEnabled(profile, "information");
    const minNoticeHours = facilitySettingNumber(profile, "permissions.min_notice_hours", 48);
    const local = localParts(profile.facility.timezone);
    const tomorrow = nextDate(local.date);
    const horizon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const [{ data: appointments }, { data: permissions }, { data: enrollments }, { data: doctorRounds }, { data: visits }, { data: informationPosts }, { data: menus }] = await Promise.all([
      supabase.from("appointments").select("id,title,starts_at,ends_at,location").eq("patient_id", profile.id).gte("ends_at", new Date().toISOString()).lte("starts_at", horizon).order("starts_at").limit(12),
      showPermissions ? supabase.from("permission_requests").select("id,departure_at,return_at,status,reason").eq("patient_id", profile.id).gte("return_at", new Date().toISOString()).lte("departure_at", horizon).order("departure_at").limit(12) : Promise.resolve({ data: [] }),
      showActivities ? supabase.from("activity_enrollments").select("id,activity:activities!inner(title,starts_at,ends_at,location)").eq("patient_id", profile.id).gte("activity.ends_at", new Date().toISOString()).lte("activity.starts_at", horizon).limit(12) : Promise.resolve({ data: [] }),
      supabase.from("doctor_rounds").select("id,scheduled_at,duration_minutes,floor_number,doctor:profiles!doctor_rounds_doctor_id_fkey(full_name)").gte("scheduled_at", new Date().toISOString()).lte("scheduled_at", horizon).order("scheduled_at").limit(6),
      showVisits ? supabase.from("visit_notifications").select("id,scheduled_start,visitor_one_name,status").eq("patient_id", profile.id).gte("scheduled_end", new Date().toISOString()).lte("scheduled_start", horizon).order("scheduled_start").limit(4) : Promise.resolve({ data: [] }),
      showInformation ? supabase.from("information_posts").select("id,title,body,created_at").eq("published", true).order("created_at", { ascending: false }).limit(3) : Promise.resolve({ data: [] }),
      supabase.from("menu_items").select("id,service_date,meal,description").in("service_date", [local.date, tomorrow]).order("service_date").limit(12),
    ]);

    const activityItems = (enrollments || []).flatMap((row) => { const relation = row.activity as { title: string; starts_at: string; ends_at: string; location: string | null } | { title: string; starts_at: string; ends_at: string; location: string | null }[] | null; const activity = Array.isArray(relation) ? relation[0] : relation; return activity ? [{ id: row.id, ...activity }] : []; });
    const keyOf = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: profile.facility.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
    const todayEvents = [
      ...(appointments || []).filter((item) => keyOf(item.starts_at) === local.date).map((item) => ({ time: item.starts_at, label: item.title, meta: item.location || "Rendez-vous", type: "Rendez-vous" })),
      ...activityItems.filter((item) => keyOf(item.starts_at) === local.date).map((item) => ({ time: item.starts_at, label: item.title, meta: item.location || "Activité", type: "Activité" })),
      ...(permissions || []).filter((item) => keyOf(item.departure_at) === local.date && ["approved", "departed"].includes(item.status)).map((item) => ({ time: item.departure_at, label: "Permission de sortie", meta: `Retour ${displayTime(item.return_at)}`, type: "Permission" })),
      ...(doctorRounds || []).filter((item) => keyOf(item.scheduled_at) === local.date).map((item) => ({ time: item.scheduled_at, label: "Passage du médecin", meta: `Étage ${item.floor_number}`, type: "Médecin" })),
    ].sort((a,b) => new Date(a.time).getTime()-new Date(b.time).getTime());
    const tomorrowEvents = [
      ...(appointments || []).filter((item) => keyOf(item.starts_at) === tomorrow).map((item) => ({ time: item.starts_at, label: item.title, meta: item.location || "Rendez-vous", type: "Rendez-vous" })),
      ...activityItems.filter((item) => keyOf(item.starts_at) === tomorrow).map((item) => ({ time: item.starts_at, label: item.title, meta: item.location || "Activité", type: "Activité" })),
      ...(permissions || []).filter((item) => keyOf(item.departure_at) === tomorrow && ["approved", "departed"].includes(item.status)).map((item) => ({ time: item.departure_at, label: "Permission de sortie", meta: `Retour ${displayTime(item.return_at)}`, type: "Permission" })),
      ...(doctorRounds || []).filter((item) => keyOf(item.scheduled_at) === tomorrow).map((item) => ({ time: item.scheduled_at, label: "Passage du médecin", meta: `Étage ${item.floor_number}`, type: "Médecin" })),
    ].sort((a,b) => new Date(a.time).getTime()-new Date(b.time).getTime());

    const mealOrder = [{ meal:"breakfast", hour:8, label:"Petit-déjeuner" }, { meal:"lunch", hour:12, label:"Déjeuner" }, { meal:"dinner", hour:19, label:"Dîner" }];
    let targetDate = local.date; let target = mealOrder.find((meal) => local.hour < meal.hour);
    if (!target) { targetDate = tomorrow; target = mealOrder[0]; }
    const nextMeal = (menus || []).find((item) => item.service_date === targetDate && item.meal === target?.meal);
    const quote = quotePool[(Number(local.date.replaceAll("-", "")) || 0) % quotePool.length];
    const nextPermission = (permissions || [])[0];
    const nextVisit = (visits || [])[0];

    return <PortalShell profile={profile}>
      <div className="patient-home-hero"><div><div className="section-kicker">Votre séjour aujourd’hui</div><h1>Bonjour, {profile.full_name.split(" ")[0]}</h1><p>Tout ce qui compte pour votre journée, sans avoir à chercher dans l’application.</p></div><Link className="button button-secondary" href="/portal/appointments">Voir tout mon planning</Link></div>

      <section className="patient-day-grid">
        <div className="patient-day-card"><div className="patient-day-head"><div><span>Aujourd’hui</span><strong>{todayEvents.length} événement{todayEvents.length > 1 ? "s" : ""}</strong></div><Link href="/portal/appointments">Planning →</Link></div><div className="patient-day-list">{todayEvents.length ? todayEvents.map((item,index)=><div className="patient-day-event" key={`${item.type}-${index}`}><time>{displayTime(item.time)}</time><div><strong>{item.label}</strong><small>{item.type} · {item.meta}</small></div></div>) : <p className="empty">Rien de prévu pour le reste de la journée.</p>}</div></div>
        <div className="patient-day-card"><div className="patient-day-head"><div><span>Demain</span><strong>{tomorrowEvents.length} événement{tomorrowEvents.length > 1 ? "s" : ""}</strong></div><Link href="/portal/appointments">Voir →</Link></div><div className="patient-day-list">{tomorrowEvents.length ? tomorrowEvents.slice(0,5).map((item,index)=><div className="patient-day-event" key={`${item.type}-${index}`}><time>{displayTime(item.time)}</time><div><strong>{item.label}</strong><small>{item.type} · {item.meta}</small></div></div>) : <p className="empty">Aucun événement prévu pour demain.</p>}</div></div>
      </section>

      <section className="patient-glance-grid">
        <Link href="/portal/menus" className="patient-glance-card patient-glance-card--meal"><span>🍽 Prochain repas</span><strong>{target?.label || "Repas"} · {target?.hour || "—"} h</strong><small>{nextMeal?.description || "Menu à confirmer"}</small></Link>
        {showPermissions && <Link href="/portal/permissions" className="patient-glance-card"><span>↗ Prochaine permission</span><strong>{nextPermission ? permissionLabels[nextPermission.status as keyof typeof permissionLabels] : "Aucune demande"}</strong><small>{nextPermission ? `${displayDateTime(nextPermission.departure_at)} → ${displayTime(nextPermission.return_at)}` : "Vous pouvez faire une demande ci-dessous"}</small></Link>}
        {showVisits && <Link href="/portal/visits" className="patient-glance-card"><span>♧ Prochaine visite</span><strong>{nextVisit ? displayTime(nextVisit.scheduled_start) : "Aucune visite"}</strong><small>{nextVisit ? nextVisit.visitor_one_name : "Prévenir l’accueil d’une visite"}</small></Link>}
        <div className="patient-glance-card patient-glance-card--quote"><span>✦ Citation du jour</span><strong>“{quote}”</strong><small>Une petite respiration pour commencer la journée.</small></div>
      </section>

      {showInformation && <section className="patient-info-preview"><div className="patient-section-head"><div><span>Informations utiles</span><h2>À savoir pendant votre séjour</h2></div><Link href="/portal/information">Tout voir →</Link></div><div className="patient-info-cards">{informationPosts?.length ? informationPosts.map((post)=><Link href="/portal/information" className="patient-info-card" key={post.id}><strong>{post.title}</strong><p>{post.body.length > 130 ? `${post.body.slice(0,130)}…` : post.body}</p><span>Lire le détail →</span></Link>) : <p className="empty">Aucune nouvelle information.</p>}</div></section>}

      {showPermissions && <section className="patient-quick-action"><div className="patient-section-head"><div><span>Action rapide</span><h2>Demander une permission sans quitter l’accueil</h2></div><Link href="/portal/permissions">Voir mon calendrier →</Link></div><PermissionForm minNoticeHours={minNoticeHours} compact /></section>}

      <section className="patient-shortcuts"><Link href="/portal/appointments">◷ Mon planning</Link>{showActivities && <Link href="/portal/activities">✦ Mes activités</Link>}<Link href="/portal/contacts">☎ Contacts & proche</Link>{showInformation && <Link href="/portal/information">i Infos pratiques</Link>}</section>
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
  return <PortalShell profile={profile}><div className="page-intro"><div><h1>Bonjour, {firstName}</h1><p>Vue opérationnelle · {roleLabels[profile.role]} · {profile.facility.name}</p></div><Link className="button button-primary" href={profile.role === "admin" ? "/portal/admin" : "/portal/permissions"}>{profile.role === "admin" ? "Gérer l’établissement" : "Voir les permissions"}</Link></div><div className="metric-grid"><div className="metric"><span>Décisions à traiter</span><strong>{pendingCount || 0}</strong><div className="metric-detail">Permissions en attente</div></div><div className="metric"><span>Permissions autorisées</span><strong>{approvedCount || 0}</strong><div className="metric-detail">À venir ou à enregistrer</div></div><div className="metric"><span>Patients absents</span><strong>{departedCount || 0}</strong><div className="metric-detail">Retour non enregistré</div></div><div className="metric"><span>Rendez-vous à venir</span><strong>{upcomingAppointments?.length || 0}</strong><div className="metric-detail">Prochains créneaux</div></div></div></PortalShell>;
}
