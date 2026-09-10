import { PortalShell } from "@/components/portal-shell";
import { SportRoomScheduleForm } from "@/components/sport-room-form";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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

export default async function SportRoomPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = addDays(today, 6);
  const { data } = await supabase.from("sport_room_schedules").select("schedule_date, opens_at, closes_at, note").gte("schedule_date", startDate).lte("schedule_date", endDate).order("schedule_date");
  const schedules = (data || []) as SportSchedule[];
  const scheduleByDate = new Map(schedules.map((schedule) => [schedule.schedule_date, schedule]));
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const canEdit = profile.role === "coach" || profile.role === "admin";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Salle de sport</h1><p>Agenda commun de la clinique. La salle est ouverte de 9 h à 12 h.</p></div></div>
    <div className={canEdit ? "dashboard-grid" : "stack"}>
      <section className="card">
        <div className="card-header"><div><h2>Planning des 7 prochains jours</h2><p className="card-subtitle">Les créneaux modifiés remplacent l’horaire standard.</p></div></div>
        <div className="card-body"><div className="sport-week">{days.map((date) => {
          const schedule = scheduleByDate.get(date);
          return <article className="sport-day" key={date}><div><strong>{formatDate(date)}</strong><span className="sport-hours">{displayTime(schedule?.opens_at || "09:00")} – {displayTime(schedule?.closes_at || "12:00")}</span></div><p>{schedule?.note || "Accès libre à tous les patients."}</p></article>;
        })}</div></div>
      </section>
      {canEdit && <aside className="card"><div className="card-header"><div><h2>Modifier le planning</h2><p className="card-subtitle">Une modification est visible par tous.</p></div></div><div className="card-body"><SportRoomScheduleForm /></div></aside>}
    </div>
  </PortalShell>;
}
