import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { PermissionForm } from "@/components/permission-form";
import { BulletinRequestButton } from "@/components/bulletin-request-button";
import { PatientDailyFeedback, PatientHelpCard } from "@/components/patient-help-feedback";
import { ReceptionWorkQueue } from "@/components/reception-work-queue";
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
function nextDate(dateKey: string) { const date = new Date(`${dateKey}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }

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
    const now = new Date().toISOString();
    const [{ data: appointments }, { data: permissions }, { data: enrollments }, { data: doctorRounds }, { data: visits }, { data: informationPosts }, { data: menus }, { data: rosterRows }, { data: bulletinRows }, { data: activeStayRows }, { data: feedbackRows }] = await Promise.all([
      supabase.from("appointments").select("id,title,starts_at,ends_at,location").eq("patient_id", profile.id).gte("ends_at", now).lte("starts_at", horizon).order("starts_at").limit(12),
      showPermissions ? supabase.from("permission_requests").select("id,departure_at,return_at,status,reason").eq("patient_id", profile.id).gte("return_at", now).lte("departure_at", horizon).order("departure_at").limit(12) : Promise.resolve({ data: [] }),
      showActivities ? supabase.from("activity_enrollments").select("id,activity:activities!inner(id,title,starts_at,ends_at,location)").eq("patient_id", profile.id).gte("activity.ends_at", now).lte("activity.starts_at", horizon).limit(12) : Promise.resolve({ data: [] }),
      supabase.from("doctor_rounds").select("id,scheduled_at,duration_minutes,floor_number,doctor:profiles!doctor_rounds_doctor_id_fkey(full_name)").gte("scheduled_at", now).lte("scheduled_at", horizon).order("scheduled_at").limit(6),
      showVisits ? supabase.from("visit_notifications").select("id,scheduled_start,visitor_one_name,status").eq("patient_id", profile.id).gte("scheduled_end", now).lte("scheduled_start", horizon).order("scheduled_start").limit(4) : Promise.resolve({ data: [] }),
      showInformation ? supabase.from("information_posts").select("id,title,body,created_at").eq("published", true).order("created_at", { ascending: false }).limit(3) : Promise.resolve({ data: [] }),
      supabase.from("menu_items").select("id,service_date,meal,description").in("service_date", [local.date, tomorrow]).order("service_date").limit(12),
      supabase.from("clinic_patient_roster").select("reference_doctor_id,reference_doctor:care_team_directory!clinic_patient_roster_reference_doctor_id_fkey(id,full_name,specialty,email)").eq("linked_profile_id", profile.id).limit(1),
      supabase.from("bulletin_requests").select("id,status,requested_at").eq("patient_id", profile.id).eq("status", "pending").limit(1),
      supabase.from("patient_stays").select("planned_discharge_at").eq("patient_id", profile.id).is("ended_at", null).limit(1),
      supabase.from("patient_daily_feedback").select("mood,feedback_date").eq("patient_id", profile.id).eq("feedback_date", local.date).limit(1),
    ]);

    const activityItems = (enrollments || []).flatMap((row) => { const relation = row.activity as { id: string; title: string; starts_at: string; ends_at: string; location: string | null } | { id: string; title: string; starts_at: string; ends_at: string; location: string | null }[] | null; const activity = Array.isArray(relation) ? relation[0] : relation; return activity ? [{ enrollmentId: row.id, ...activity }] : []; });
    const activityIds = activityItems.map((item) => item.id);
    const referenceRow = rosterRows?.[0] as { reference_doctor_id: string; reference_doctor: { id: string; full_name: string; specialty: string | null; email: string | null } | { id: string; full_name: string; specialty: string | null; email: string | null }[] | null } | undefined;
    const referenceDoctor = referenceRow ? (Array.isArray(referenceRow.reference_doctor) ? referenceRow.reference_doctor[0] : referenceRow.reference_doctor) : null;
    const [{ data: activityUpdates }, { data: absences }] = await Promise.all([
      activityIds.length ? supabase.from("activity_updates").select("id,activity_id,update_type,message,created_at").in("activity_id", activityIds).order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
      referenceDoctor ? supabase.from("doctor_absences").select("id,starts_at,ends_at,reason,replacement:care_team_directory!doctor_absences_replacement_doctor_id_fkey(full_name)").eq("doctor_id", referenceDoctor.id).gte("ends_at", now).order("starts_at").limit(1) : Promise.resolve({ data: [] }),
    ]);
    const upcomingAbsence = absences?.[0] as { starts_at: string; ends_at: string; reason: string | null; replacement: { full_name: string } | { full_name: string }[] | null } | undefined;
    const replacement = upcomingAbsence ? (Array.isArray(upcomingAbsence.replacement) ? upcomingAbsence.replacement[0] : upcomingAbsence.replacement) : null;
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
    let targetDate = local.date; let target = mealOrder.find((meal) => local.hour < meal.hour); if (!target) { targetDate = tomorrow; target = mealOrder[0]; }
    const nextMeal = (menus || []).find((item) => item.service_date === targetDate && item.meal === target?.meal);
    const quote = quotePool[(Number(local.date.replaceAll("-", "")) || 0) % quotePool.length];
    const nextPermission = (permissions || [])[0];
    const nextVisit = (visits || [])[0];
    const nextActions = [...todayEvents, ...tomorrowEvents].filter((event) => new Date(event.time).getTime() >= Date.now()).sort((a,b) => new Date(a.time).getTime()-new Date(b.time).getTime()).slice(0,3);
    const plannedDischarge = activeStayRows?.[0]?.planned_discharge_at || null;
    const dischargeDays = plannedDischarge ? Math.ceil((new Date(plannedDischarge).getTime() - Date.now()) / 86400000) : null;
    const currentMood = feedbackRows?.[0]?.mood || null;

    return <PortalShell profile={profile}>
      <div className="patient-home-hero"><div><div className="section-kicker">Votre séjour aujourd’hui</div><h1>Bonjour, {profile.full_name.split(" ")[0]}</h1><p>Tout ce qui compte pour votre journée, sans avoir à chercher dans l’application.</p></div><Link className="button button-secondary" href="/portal/appointments">Voir tout mon planning</Link></div>

      {(activityUpdates?.length || upcomingAbsence) && <section className="patient-alert-stack">
        {activityUpdates?.slice(0,3).map((alert) => { const activity = activityItems.find((item) => item.id === alert.activity_id); return <Link href="/portal/activities" className={`patient-live-alert patient-live-alert--${alert.update_type}`} key={alert.id}><strong>{alert.update_type === "absence" ? "Activité annulée / intervenant absent" : alert.update_type === "change" ? "Activité modifiée" : "Information activité"}</strong><span>{activity?.title || "Activité"} · {alert.message}</span><small>Voir l’activité →</small></Link>; })}
        {upcomingAbsence && <div className="patient-live-alert patient-live-alert--doctor"><strong>Votre médecin référent sera absent</strong><span>{referenceDoctor?.full_name} · {displayDateTime(upcomingAbsence.starts_at)} → {displayDateTime(upcomingAbsence.ends_at)}{replacement?.full_name ? ` · Relais : ${replacement.full_name}` : ""}</span></div>}
      </section>}

      <section className="patient-next-actions"><div className="patient-section-head"><div><span>En un coup d’œil</span><h2>Mes 3 prochaines étapes</h2></div><Link href="/portal/appointments">Planning complet →</Link></div><div className="patient-next-list">{nextActions.length ? nextActions.map((item,index) => <div className="patient-next-row" key={`${item.type}-${index}`}><span>{index+1}</span><time>{displayTime(item.time)}</time><div><strong>{item.label}</strong><small>{item.type} · {item.meta}</small></div></div>) : <p className="empty">Rien à préparer pour le moment.</p>}</div></section>

      <section className="patient-day-grid">
        <div className="patient-day-card"><div className="patient-day-head"><div><span>Aujourd’hui</span><strong>{todayEvents.length} événement{todayEvents.length > 1 ? "s" : ""}</strong></div><Link href="/portal/appointments">Planning →</Link></div><div className="patient-day-list">{todayEvents.length ? todayEvents.map((item,index)=><div className="patient-day-event" key={`${item.type}-${index}`}><time>{displayTime(item.time)}</time><div><strong>{item.label}</strong><small>{item.type} · {item.meta}</small></div></div>) : <p className="empty">Rien de prévu pour le reste de la journée.</p>}</div></div>
        <div className="patient-day-card"><div className="patient-day-head"><div><span>Demain</span><strong>{tomorrowEvents.length} événement{tomorrowEvents.length > 1 ? "s" : ""}</strong></div><Link href="/portal/appointments">Voir →</Link></div><div className="patient-day-list">{tomorrowEvents.length ? tomorrowEvents.slice(0,5).map((item,index)=><div className="patient-day-event" key={`${item.type}-${index}`}><time>{displayTime(item.time)}</time><div><strong>{item.label}</strong><small>{item.type} · {item.meta}</small></div></div>) : <p className="empty">Aucun événement prévu pour demain.</p>}</div></div>
      </section>

      {plannedDischarge && dischargeDays != null && dischargeDays <= 3 && dischargeDays >= 0 && <section className="patient-discharge-prep"><div><span className="section-kicker">Préparer ma sortie</span><h2>{dischargeDays === 0 ? "Votre sortie est prévue aujourd’hui" : `J-${dischargeDays} avant votre sortie`}</h2><p>Sortie prévue : <strong>{displayDateTime(plannedDischarge)}</strong></p></div><div className="patient-discharge-checklist"><span>✓ Vérifier vos affaires personnelles</span><span>✓ Anticiper votre transport</span><span>✓ Demander vos documents si nécessaire</span><span>✓ Vérifier que votre proche est informé si vous le souhaitez</span></div></section>}

      <section className="patient-glance-grid">
        {referenceDoctor && <div className="patient-glance-card"><span>🩺 Mon médecin référent</span><strong>{referenceDoctor.full_name}</strong><small>{referenceDoctor.specialty || "Médecin référent"}{replacement?.full_name ? ` · relais prévu : ${replacement.full_name}` : ""}</small></div>}
        <Link href="/portal/menus" className="patient-glance-card patient-glance-card--meal"><span>🍽 Prochain repas</span><strong>{target?.label || "Repas"} · {target?.hour || "—"} h</strong><small>{nextMeal?.description || "Menu à confirmer"}</small></Link>
        {showPermissions && <Link href="/portal/permissions" className="patient-glance-card"><span>↗ Prochaine permission</span><strong>{nextPermission ? permissionLabels[nextPermission.status as keyof typeof permissionLabels] : "Aucune demande"}</strong><small>{nextPermission ? `${displayDateTime(nextPermission.departure_at)} → ${displayTime(nextPermission.return_at)}` : "Vous pouvez faire une demande ci-dessous"}</small></Link>}
        {showVisits && <Link href="/portal/visits" className="patient-glance-card"><span>♧ Prochaine visite</span><strong>{nextVisit ? displayTime(nextVisit.scheduled_start) : "Aucune visite"}</strong><small>{nextVisit ? nextVisit.visitor_one_name : "Prévenir l’accueil d’une visite"}</small></Link>}
        <div className="patient-glance-card patient-glance-card--quote"><span>✦ Citation du jour</span><strong>“{quote}”</strong><small>Une petite respiration pour commencer la journée.</small></div>
      </section>

      <PatientHelpCard />
      <PatientDailyFeedback currentMood={currentMood} />

      <section className="patient-bulletin-card"><div><span className="section-kicker">Document administratif</span><h2>Besoin d’un bulletin de situation ?</h2><p>Un clic suffit. L’accueil reçoit la demande et prépare l’envoi vers votre adresse email enregistrée.</p></div><BulletinRequestButton pending={Boolean(bulletinRows?.length)} /></section>

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
    const [{ data: permissions }, { data: stays }, { data: appointments }, { data: bulletins }, { data: receptionVisits }, { data: receptionTasks }, { data: helpRequests }, dischargesResult] = await Promise.all([
      supabase.from("permission_requests").select("id, departure_at, return_at, reason, status, doctor_decision, manager_decision, departed_at, returned_at, patient:profiles!permission_requests_patient_id_fkey(full_name, phone)").in("status", ["submitted", "waiting", "approved", "departed"]).order("departure_at").limit(50),
      supabase.from("patient_stays").select("id, presence, room_number, ward:wards(name, floor), patient:profiles!patient_stays_patient_id_fkey(full_name, phone)").is("ended_at", null).order("room_number").limit(100),
      supabase.from("appointments").select("id, title, starts_at, location, patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at", new Date().toISOString()).order("starts_at").limit(12),
      role === "reception" ? supabase.from("bulletin_requests").select("id,status,requested_at,email_to,patient:profiles!bulletin_requests_patient_id_fkey(full_name)").in("status", ["pending", "generated"]).order("requested_at").limit(10) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.from("visit_notifications").select("id,status,scheduled_start,visitor_one_name,patient:profiles!visit_notifications_patient_id_fkey(full_name)").in("status", ["scheduled", "arrived"]).order("scheduled_start").limit(20) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.from("operational_tasks").select("id,title,due_at,patient:profiles!operational_tasks_patient_id_fkey(full_name)").eq("assigned_role", "reception").eq("status", "pending").order("due_at").limit(20) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.from("patient_service_requests").select("id,category,message,created_at,patient:profiles!patient_service_requests_patient_id_fkey(full_name)").eq("status", "pending").order("created_at").limit(20) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.rpc("discharge_planning_board") : Promise.resolve({ data: [] }),
    ]);
    return <PortalShell profile={profile}>
      {role === "reception" && <ReceptionWorkQueue permissions={(permissions || []) as never[]} visits={(receptionVisits || []) as never[]} bulletins={(bulletins || []) as never[]} tasks={(receptionTasks || []) as never[]} discharges={(dischargesResult.data || []) as never[]} helpRequests={(helpRequests || []) as never[]} locale={profile.facility.locale} timezone={profile.facility.timezone} />}
      <StaffDashboard role={role} firstName={profile.full_name.split(" ")[0]} permissions={(permissions || []) as StaffPermission[]} stays={(stays || []) as StaffStay[]} appointments={(appointments || []) as StaffAppointment[]} />
    </PortalShell>;
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
