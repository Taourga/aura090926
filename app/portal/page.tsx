import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { BulletinRequestButton } from "@/components/bulletin-request-button";
import { PatientDailyFeedback, PatientHelpCard } from "@/components/patient-help-feedback";
import { ReceptionWorkQueue } from "@/components/reception-work-queue";
import { facilityFeatureEnabled, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";
import { roleLabels } from "@/lib/types";
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
    const local = localParts(profile.facility.timezone);
    const tomorrow = nextDate(local.date);
    const horizon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const todayLabel = new Intl.DateTimeFormat(profile.facility.locale || "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: profile.facility.timezone }).format(new Date(`${local.date}T12:00:00Z`));

    const [{ data: appointments }, { data: permissions }, { data: enrollments }, { data: doctorRounds }, { data: visits }, { data: informationPosts }, { data: menus }, { data: rosterRows }, { data: bulletinRows }, { data: activeStayRows }, { data: feedbackRows }] = await Promise.all([
      supabase.from("appointments").select("id,title,starts_at,ends_at,location").eq("patient_id", profile.id).gte("ends_at", now).lte("starts_at", horizon).order("starts_at").limit(12),
      showPermissions ? supabase.from("permission_requests").select("id,departure_at,return_at,status,reason,doctor_decision,manager_decision").eq("patient_id", profile.id).gte("return_at", now).order("departure_at").limit(12) : Promise.resolve({ data: [] }),
      showActivities ? supabase.from("activity_enrollments").select("id,activity:activities!inner(id,title,starts_at,ends_at,location)").eq("patient_id", profile.id).gte("activity.ends_at", now).lte("activity.starts_at", horizon).limit(12) : Promise.resolve({ data: [] }),
      supabase.from("doctor_rounds").select("id,scheduled_at,duration_minutes,floor_number,doctor:profiles!doctor_rounds_doctor_id_fkey(full_name)").gte("scheduled_at", now).lte("scheduled_at", horizon).order("scheduled_at").limit(6),
      showVisits ? supabase.from("visit_notifications").select("id,scheduled_start,scheduled_end,visitor_one_name,status").eq("patient_id", profile.id).neq("status","cancelled").gte("scheduled_end", now).lte("scheduled_start", horizon).order("scheduled_start").limit(8) : Promise.resolve({ data: [] }),
      showInformation ? supabase.from("information_posts").select("id,title,body,created_at").eq("published", true).order("created_at", { ascending: false }).limit(2) : Promise.resolve({ data: [] }),
      supabase.from("menu_items").select("id,service_date,meal,description").in("service_date", [local.date, tomorrow]).order("service_date").limit(12),
      supabase.from("clinic_patient_roster").select("reference_doctor_id,reference_doctor:care_team_directory!clinic_patient_roster_reference_doctor_id_fkey(id,full_name,specialty)").eq("linked_profile_id", profile.id).limit(1),
      supabase.from("bulletin_requests").select("id,status,requested_at").eq("patient_id", profile.id).eq("status", "pending").limit(1),
      supabase.from("patient_stays").select("planned_discharge_at,room_number,presence").eq("patient_id", profile.id).is("ended_at", null).limit(1),
      supabase.from("patient_daily_feedback").select("mood,feedback_date").eq("patient_id", profile.id).eq("feedback_date", local.date).limit(1),
    ]);

    const activityItems = (enrollments || []).flatMap((row) => {
      const relation = row.activity as { id: string; title: string; starts_at: string; ends_at: string; location: string | null } | { id: string; title: string; starts_at: string; ends_at: string; location: string | null }[] | null;
      const activity = Array.isArray(relation) ? relation[0] : relation;
      return activity ? [{ enrollmentId: row.id, ...activity }] : [];
    });
    const activityIds = activityItems.map((item) => item.id);
    const referenceRow = rosterRows?.[0] as { reference_doctor: { id: string; full_name: string; specialty: string | null } | { id: string; full_name: string; specialty: string | null }[] | null } | undefined;
    const referenceDoctor = referenceRow ? (Array.isArray(referenceRow.reference_doctor) ? referenceRow.reference_doctor[0] : referenceRow.reference_doctor) : null;
    const [{ data: activityUpdates }, { data: absences }] = await Promise.all([
      activityIds.length ? supabase.from("activity_updates").select("id,activity_id,update_type,message,created_at").in("activity_id", activityIds).order("created_at", { ascending: false }).limit(3) : Promise.resolve({ data: [] }),
      referenceDoctor ? supabase.from("doctor_absences").select("id,starts_at,ends_at,reason,replacement:care_team_directory!doctor_absences_replacement_doctor_id_fkey(full_name)").eq("doctor_id", referenceDoctor.id).gte("ends_at", now).order("starts_at").limit(1) : Promise.resolve({ data: [] }),
    ]);
    const upcomingAbsence = absences?.[0] as { starts_at: string; ends_at: string; replacement: { full_name: string } | { full_name: string }[] | null } | undefined;
    const replacement = upcomingAbsence ? (Array.isArray(upcomingAbsence.replacement) ? upcomingAbsence.replacement[0] : upcomingAbsence.replacement) : null;
    const keyOf = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: profile.facility.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

    const buildEvents = (day: string) => [
      ...(appointments || []).filter((item) => keyOf(item.starts_at) === day).map((item) => ({ time: item.starts_at, label: item.title, meta: item.location || "Rendez-vous", href: "/portal/appointments", kind: "RDV", icon: "◷" })),
      ...activityItems.filter((item) => keyOf(item.starts_at) === day).map((item) => ({ time: item.starts_at, label: item.title, meta: item.location || "Activité", href: "/portal/activities", kind: "ACTIVITÉ", icon: "✦" })),
      ...(visits || []).filter((item) => keyOf(item.scheduled_start) === day).map((item) => ({ time: item.scheduled_start, label: `Visite de ${item.visitor_one_name}`, meta: item.status === "arrived" ? "Visite en cours" : "Visite prévue", href: "/portal/visits", kind: "VISITE", icon: "♧" })),
      ...(permissions || []).filter((item) => keyOf(item.departure_at) === day && ["approved", "departed"].includes(item.status)).map((item) => ({ time: item.departure_at, label: "Permission de sortie", meta: `Retour ${displayTime(item.return_at)}`, href: "/portal/permissions", kind: "PERMISSION", icon: "✓" })),
      ...(doctorRounds || []).filter((item) => keyOf(item.scheduled_at) === day).map((item) => ({ time: item.scheduled_at, label: "Passage du médecin", meta: `Étage ${item.floor_number}`, href: "/portal/appointments", kind: "MÉDECIN", icon: "⚕" })),
    ].sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const todayEvents = buildEvents(local.date);
    const tomorrowEvents = buildEvents(tomorrow);
    const mealOrder = [{ meal:"breakfast", hour:8, label:"Petit-déjeuner" }, { meal:"lunch", hour:12, label:"Déjeuner" }, { meal:"dinner", hour:19, label:"Dîner" }];
    let targetDate = local.date; let target = mealOrder.find((meal) => local.hour < meal.hour); if (!target) { targetDate = tomorrow; target = mealOrder[0]; }
    const nextMeal = (menus || []).find((item) => item.service_date === targetDate && item.meal === target?.meal);
    const quote = quotePool[(Number(local.date.replaceAll("-", "")) || 0) % quotePool.length];
    const stay = activeStayRows?.[0];
    const plannedDischarge = stay?.planned_discharge_at || null;
    const dischargeDays = plannedDischarge ? Math.ceil((new Date(plannedDischarge).getTime() - Date.now()) / 86400000) : null;
    const currentMood = feedbackRows?.[0]?.mood || null;
    const pendingPermission = (permissions || []).find(item=>["submitted","waiting"].includes(item.status));
    const pendingFor = pendingPermission ? [!pendingPermission.doctor_decision?"médecin":null,!pendingPermission.manager_decision?"cadre":null].filter(Boolean).join(" + ") : "";

    return <PortalShell profile={profile}>
      <section className="patient-cockpit-head">
        <div><span className="section-kicker">Ma journée · {todayLabel}</span><h1>Bonjour {profile.full_name.split(" ")[0]}</h1><p>Chambre {stay?.room_number || "—"} · {stay?.presence === "out" ? "Vous êtes actuellement hors de l’établissement" : "Vous êtes présent dans l’établissement"}</p></div>
        <Link href="/portal/appointments" className="button button-primary">◷ Mon planning</Link>
      </section>

      {(activityUpdates?.length || upcomingAbsence || visits?.length || pendingFor) ? <section className="patient-cockpit-alerts patient-notifications" aria-label="Notifications">
        {visits?.slice(0,1).map(visit=><Link href="/portal/visits" key={visit.id}><strong>♧ Visite à venir</strong><span>{displayDateTime(visit.scheduled_start)} · {visit.visitor_one_name}</span></Link>)}
        {activityUpdates?.slice(0,2).map((alert)=>{ const activity=activityItems.find((item)=>item.id===alert.activity_id); return <Link href="/portal/activities" key={alert.id}><strong>{alert.update_type === "absence" ? "⚠ Activité annulée" : "✦ Activité modifiée"}</strong><span>{activity?.title || "Activité"} · {alert.message}</span></Link>; })}
        {pendingFor&&<Link href="/portal/permissions"><strong>✓ Permission en attente</strong><span>Validation attendue : {pendingFor}</span></Link>}
        {upcomingAbsence && <div><strong>⚕ Médecin référent absent prochainement</strong><span>{referenceDoctor?.full_name}{replacement?.full_name ? ` · relais ${replacement.full_name}` : ""}</span></div>}
      </section> : null}

      <section className="patient-cockpit-main">
        <article className="patient-cockpit-day patient-cockpit-day--today">
          <div className="patient-cockpit-title"><div><span>AUJOURD’HUI · {todayLabel.toUpperCase()}</span><h2>{todayEvents.length ? `${todayEvents.length} chose${todayEvents.length > 1 ? "s" : ""} prévue${todayEvents.length > 1 ? "s" : ""}` : "Journée calme"}</h2></div><Link href="/portal/appointments">Calendrier →</Link></div>
          <div>{todayEvents.length ? todayEvents.slice(0,4).map((item,index)=><Link href={item.href} className="patient-cockpit-event" key={`${item.kind}-${index}`}><span className="patient-event-icon">{item.icon}</span><time>{displayTime(item.time)}</time><div><small>{item.kind}</small><strong>{item.label}</strong><span>{item.meta}</span></div><b>›</b></Link>) : <p className="empty">Rien de prévu pour le moment.</p>}</div>
        </article>

        <aside className="patient-cockpit-side">
          <article><span>DEMAIN</span><strong>{tomorrowEvents.length} événement{tomorrowEvents.length > 1 ? "s" : ""}</strong>{tomorrowEvents[0] && <small>{displayTime(tomorrowEvents[0].time)} · {tomorrowEvents[0].label}</small>}<Link href="/portal/appointments">Voir demain →</Link></article>
          <Link href="/portal/menus"><span>PROCHAIN REPAS</span><strong>{target?.label} · {target?.hour} h</strong><small>{nextMeal?.description || "Menu à confirmer"}</small></Link>
          {referenceDoctor && <article><span>MÉDECIN RÉFÉRENT</span><strong>{referenceDoctor.full_name}</strong><small>{referenceDoctor.specialty || "Médecin référent"}</small></article>}
        </aside>
      </section>

      <section className="patient-cockpit-actions" aria-label="Accès rapides">
        <Link href="/portal/appointments"><b>◷</b><span><strong>Planning</strong><small>Mon calendrier</small></span></Link>
        {showActivities && <Link href="/portal/activities"><b>✦</b><span><strong>Activités</strong><small>Avec / sans prescription</small></span></Link>}
        {showVisits && <Link href="/portal/visits"><b>♧</b><span><strong>Visites</strong><small>Ajouter une visite</small></span></Link>}
        {showPermissions && <Link href="/portal/permissions"><b>✓</b><span><strong>Permissions</strong><small>Demander ou suivre</small></span></Link>}
      </section>

      {plannedDischarge && dischargeDays != null && dischargeDays <= 3 && dischargeDays >= 0 && <section className="patient-cockpit-discharge"><strong>{dischargeDays === 0 ? "Sortie prévue aujourd’hui" : `J-${dischargeDays} avant votre sortie`}</strong><span>{displayDateTime(plannedDischarge)}</span><Link href="/portal/information">Préparer ma sortie →</Link></section>}

      <section className="patient-cockpit-bottom">
        <article className="patient-cockpit-quote"><span>✦ Citation du jour</span><strong>“{quote}”</strong></article>
        <article className="patient-cockpit-bulletin"><div><span>Document administratif</span><strong>Bulletin de situation</strong></div><BulletinRequestButton pending={Boolean(bulletinRows?.length)} /></article>
      </section>

      <details className="patient-cockpit-more"><summary>Autres services</summary><div className="patient-cockpit-more-grid"><PatientHelpCard /><PatientDailyFeedback currentMood={currentMood} />{showInformation && informationPosts?.length ? <div className="patient-mini-info"><strong>Infos utiles</strong>{informationPosts.map((post)=><Link key={post.id} href="/portal/information">{post.title} →</Link>)}</div> : null}</div></details>
    </PortalShell>;
  }

  if (profile.role === "doctor") {
    const [{ data: permissions }, { data: stays }, { data: appointments }, { data: doctorRounds }, { data: externalAppointments }] = await Promise.all([
      supabase.from("permission_requests").select("id,departure_at,return_at,reason,status,doctor_decision,manager_decision,departed_at,returned_at,patient:profiles!permission_requests_patient_id_fkey(full_name,phone)").in("status", ["submitted","waiting","approved","refused","departed"]).order("departure_at").limit(50),
      supabase.from("patient_stays").select("id,presence,room_number,ward:wards(name,floor),patient:profiles!patient_stays_patient_id_fkey(full_name,phone)").is("ended_at",null).order("room_number").limit(100),
      supabase.from("appointments").select("id,title,starts_at,location,patient:profiles!appointments_patient_id_fkey(full_name)").eq("creator_id",profile.id).gte("starts_at",new Date().toISOString()).order("starts_at").limit(12),
      supabase.from("doctor_rounds").select("id,floor_number,scheduled_at").eq("doctor_id",profile.id).gte("scheduled_at",new Date().toISOString()).order("scheduled_at").limit(8),
      supabase.from("doctor_schedule_blocks").select("id,starts_at,ends_at").eq("doctor_id",profile.id).gte("ends_at",new Date().toISOString()).order("starts_at").limit(12),
    ]);
    return <PortalShell profile={profile}><StaffDashboard role="doctor" firstName={profile.full_name.split(" ")[0]} permissions={(permissions || []) as StaffPermission[]} stays={(stays || []) as StaffStay[]} appointments={(appointments || []) as StaffAppointment[]} doctorRounds={(doctorRounds || []) as DoctorRound[]} externalAppointments={(externalAppointments || []) as DoctorScheduleBlock[]} /></PortalShell>;
  }

  const operationalRoles: OperationalRole[] = ["manager", "nurse", "reception"];
  if (operationalRoles.includes(profile.role as OperationalRole)) {
    const role = profile.role as OperationalRole;
    const [{ data: permissions }, { data: stays }, { data: appointments }, { data: bulletins }, { data: receptionVisits }, { data: receptionTasks }, { data: helpRequests }, dischargesResult] = await Promise.all([
      supabase.from("permission_requests").select("id,departure_at,return_at,reason,status,doctor_decision,manager_decision,departed_at,returned_at,patient:profiles!permission_requests_patient_id_fkey(full_name,phone)").in("status", ["submitted","waiting","approved","departed"]).order("departure_at").limit(50),
      supabase.from("patient_stays").select("id,presence,room_number,ward:wards(name,floor),patient:profiles!patient_stays_patient_id_fkey(full_name,phone)").is("ended_at",null).order("room_number").limit(100),
      supabase.from("appointments").select("id,title,starts_at,location,patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at",new Date().toISOString()).order("starts_at").limit(12),
      role === "reception" ? supabase.from("bulletin_requests").select("id,status,requested_at,email_to,patient:profiles!bulletin_requests_patient_id_fkey(full_name)").in("status", ["pending","generated"]).order("requested_at").limit(10) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.from("visit_notifications").select("id,status,scheduled_start,visitor_one_name,patient:profiles!visit_notifications_patient_id_fkey(full_name)").in("status", ["scheduled","arrived"]).order("scheduled_start").limit(20) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.from("operational_tasks").select("id,title,due_at,patient:profiles!operational_tasks_patient_id_fkey(full_name)").eq("assigned_role","reception").eq("status","pending").order("due_at").limit(20) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.from("patient_service_requests").select("id,category,message,created_at,patient:profiles!patient_service_requests_patient_id_fkey(full_name)").eq("status","pending").order("created_at").limit(20) : Promise.resolve({ data: [] }),
      role === "reception" ? supabase.rpc("discharge_planning_board") : Promise.resolve({ data: [] }),
    ]);
    return <PortalShell profile={profile}>
      {role === "reception" && <ReceptionWorkQueue permissions={(permissions || []) as never[]} visits={(receptionVisits || []) as never[]} bulletins={(bulletins || []) as never[]} tasks={(receptionTasks || []) as never[]} discharges={(dischargesResult.data || []) as never[]} helpRequests={(helpRequests || []) as never[]} locale={profile.facility.locale} timezone={profile.facility.timezone} />}
      <StaffDashboard role={role} firstName={profile.full_name.split(" ")[0]} permissions={(permissions || []) as StaffPermission[]} stays={(stays || []) as StaffStay[]} appointments={(appointments || []) as StaffAppointment[]} />
    </PortalShell>;
  }

  const [{ count: pendingCount }, { count: approvedCount }, { count: departedCount }, { data: upcomingAppointments }] = await Promise.all([
    supabase.from("permission_requests").select("*", { count: "exact", head: true }).in("status", ["submitted","waiting"]),
    supabase.from("permission_requests").select("*", { count: "exact", head: true }).eq("status","approved"),
    supabase.from("permission_requests").select("*", { count: "exact", head: true }).eq("status","departed"),
    supabase.from("appointments").select("id,title,starts_at,location,patient:profiles!appointments_patient_id_fkey(full_name)").gte("starts_at",new Date().toISOString()).order("starts_at").limit(6),
  ]);
  const firstName = profile.full_name.split(" ")[0];
  return <PortalShell profile={profile}><div className="page-intro"><div><h1>Bonjour, {firstName}</h1><p>Vue opérationnelle · {roleLabels[profile.role]} · {profile.facility.name}</p></div><Link className="button button-primary" href={profile.role === "admin" ? "/portal/admin" : "/portal/permissions"}>{profile.role === "admin" ? "Gérer l’établissement" : "Voir les permissions"}</Link></div><div className="metric-grid"><div className="metric"><span>Décisions à traiter</span><strong>{pendingCount || 0}</strong></div><div className="metric"><span>Permissions autorisées</span><strong>{approvedCount || 0}</strong></div><div className="metric"><span>Patients absents</span><strong>{departedCount || 0}</strong></div><div className="metric"><span>Rendez-vous à venir</span><strong>{upcomingAppointments?.length || 0}</strong></div></div></PortalShell>;
}
