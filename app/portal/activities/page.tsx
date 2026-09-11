import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { ActivityButton } from "@/components/activity-button";
import { ActivityForm } from "@/components/activity-form";
import { SportRoomScheduleForm } from "@/components/sport-room-form";
import { AttendanceActions } from "@/components/attendance-actions";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { attendanceLabels, type AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type SportSchedule = { schedule_date: string; opens_at: string; closes_at: string; note: string | null };

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy.toISOString().slice(0, 10);
}

function displayTime(value: string) {
  return value.slice(0, 5).replace(":", " h ");
}

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  const showSport = section === "sport";
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = addDays(today, 6);
  const [{ data: activities }, { data: enrollments }, { data: enrollmentCounts }, { data: sportData }] = await Promise.all([
    supabase.from("activities").select("id, title, description, starts_at, ends_at, location, capacity, active").eq("active", true).gte("starts_at", new Date().toISOString()).order("starts_at").limit(60),
    supabase.from("activity_enrollments").select("id, activity_id, patient_id, attendance_status, patient:profiles!activity_enrollments_patient_id_fkey(full_name)"),
    supabase.rpc("activity_enrollment_counts"),
    supabase.from("sport_room_schedules").select("schedule_date, opens_at, closes_at, note").gte("schedule_date", startDate).lte("schedule_date", endDate).order("schedule_date"),
  ]);
  const enrollmentList = enrollments || [];
  const enrollmentCountRows = (enrollmentCounts || []) as { activity_id: string; enrolled_count: number | string }[];
  const countByActivity = new Map(enrollmentCountRows.map((item) => [item.activity_id, Number(item.enrolled_count)]));
  const schedules = (sportData || []) as SportSchedule[];
  const scheduleByDate = new Map(schedules.map((schedule) => [schedule.schedule_date, schedule]));
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const canManageActivities = profile.role === "governance" || profile.role === "admin";
  const canManageSport = profile.role === "coach" || profile.role === "admin";
  const canMarkAttendance = ["doctor", "manager", "psychologist", "provider", "governance", "coach", "admin"].includes(profile.role);

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Activités</h1><p>Choisissez un atelier ou consultez le planning de la salle de sport.</p></div></div>
    <nav className="section-tabs" aria-label="Sous-menu des activités"><Link href="/portal/activities" className={!showSport ? "active" : ""}>Ateliers</Link><Link href="/portal/activities?section=sport" className={showSport ? "active" : ""}>Salle de sport</Link></nav>
    {showSport ? <div className={canManageSport ? "dashboard-grid" : "stack"}>
      <section className="card"><div className="card-header"><div><h2>Planning de la salle de sport</h2><p className="card-subtitle">Accès libre de 9 h à 12 h, sauf créneau indiqué.</p></div></div><div className="card-body"><div className="sport-week">{days.map((date) => { const schedule = scheduleByDate.get(date); return <article className="sport-day" key={date}><div><strong>{formatDate(date)}</strong><span className="sport-hours">{displayTime(schedule?.opens_at || "09:00")} – {displayTime(schedule?.closes_at || "12:00")}</span></div><p>{schedule?.note || "Accès libre à tous les patients."}</p></article>; })}</div></div></section>
      {canManageSport && <aside className="card"><div className="card-header"><div><h2>Modifier le planning</h2><p className="card-subtitle">Une alerte e-mail est envoyée lorsque la messagerie est configurée.</p></div></div><div className="card-body"><SportRoomScheduleForm /></div></aside>}
    </div> : <div className={canManageActivities ? "dashboard-grid" : "stack"}>
      <section className="card"><div className="card-header"><div><h2>Prochaines activités</h2><p className="card-subtitle">Sport, art-thérapie, relaxation et autres ateliers.</p></div></div><div className="card-body"><div className="list">{activities?.length ? activities.map((activity) => { const used = countByActivity.get(activity.id) || 0; const enrolled = enrollmentList.find((item) => item.activity_id === activity.id && item.patient_id === profile.id); const attendees = enrollmentList.filter((item) => item.activity_id === activity.id); return <div key={activity.id} className="stack"><div className="list-row" style={{ gridTemplateColumns: "100px minmax(0,1fr) auto" }}><div className="time">{formatDateTime(activity.starts_at)}</div><div><div className="row-title">{activity.title}</div><div className="row-meta">{activity.description || ""}{activity.location ? ` · ${activity.location}` : ""} · {used}/{activity.capacity} places</div></div>{profile.role === "patient" ? <div><ActivityButton activityId={activity.id} enrolled={Boolean(enrolled)} full={used >= activity.capacity} />{enrolled && <span className="badge badge-info">{attendanceLabels[enrolled.attendance_status as AttendanceStatus]}</span>}</div> : <span className="badge badge-info">{used} inscrit{used > 1 ? "s" : ""}</span>}</div>{canMarkAttendance && attendees.length > 0 && <div className="attendance-list"><strong>Présences des inscrits</strong>{attendees.map((attendee) => { const patient = Array.isArray(attendee.patient) ? attendee.patient[0] : attendee.patient; return <div className="list-row" key={attendee.id} style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}><span>{patient?.full_name || "Patient"}</span><span className="badge badge-info">{attendanceLabels[attendee.attendance_status as AttendanceStatus]}</span><AttendanceActions kind="activity" recordId={attendee.id} /></div>; })}</div>}</div>; }) : <p className="empty">Aucune activité n&apos;est programmée pour le moment.</p>}</div></div></section>
      {canManageActivities && <aside className="card"><div className="card-header"><div><h2>Ajouter une activité</h2><p className="card-subtitle">Une alerte e-mail est envoyée lorsque la messagerie est configurée.</p></div></div><div className="card-body"><ActivityForm /></div></aside>}
    </div>}
  </PortalShell>;
}
