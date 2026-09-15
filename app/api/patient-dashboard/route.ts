/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function dateKey(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: facilityRows } = await supabase.rpc("get_my_facilities");
  const facility = (facilityRows || []).find((row: any) => row.is_active);
  if (!facility || facility.role !== "patient") return NextResponse.json({ error: "not_patient" }, { status: 403 });

  const timezone = facility.timezone || "Europe/Paris";
  const locale = facility.default_locale || "fr-FR";
  const now = new Date();
  const today = dateKey(now.toISOString(), timezone);
  const weekEnd = addDays(today, 7);
  const rangeStart = new Date(`${today}T00:00:00Z`).toISOString();
  const rangeEnd = new Date(`${weekEnd}T23:59:59Z`).toISOString();

  const [appointmentsRes, permissionsRes, enrollmentsRes, roundsRes, menusRes, rosterRes, stayRes] = await Promise.all([
    supabase.from("appointments").select("id,title,starts_at,ends_at,location").eq("patient_id", user.id).gte("starts_at", rangeStart).lte("starts_at", rangeEnd).order("starts_at").limit(40),
    supabase.from("permission_requests").select("id,departure_at,return_at,status,reason").eq("patient_id", user.id).gte("departure_at", rangeStart).lte("departure_at", rangeEnd).order("departure_at").limit(30),
    supabase.from("activity_enrollments").select("id,activity:activities!inner(id,title,starts_at,ends_at,location)").eq("patient_id", user.id).gte("activity.starts_at", rangeStart).lte("activity.starts_at", rangeEnd).limit(40),
    supabase.from("doctor_rounds").select("id,scheduled_at,duration_minutes,floor_number,doctor:profiles!doctor_rounds_doctor_id_fkey(full_name)").gte("scheduled_at", rangeStart).lte("scheduled_at", rangeEnd).order("scheduled_at").limit(20),
    supabase.from("menu_items").select("id,service_date,meal,description").in("service_date", [today, addDays(today, 1)]).order("service_date").limit(20),
    supabase.from("clinic_patient_roster").select("reference_doctor:care_team_directory!clinic_patient_roster_reference_doctor_id_fkey(full_name,specialty)").eq("linked_profile_id", user.id).limit(1),
    supabase.from("patient_stays").select("room_number,presence,planned_discharge_at").eq("patient_id", user.id).is("ended_at", null).limit(1),
  ]);

  const activityItems = (enrollmentsRes.data || []).flatMap((row: any) => {
    const activity = Array.isArray(row.activity) ? row.activity[0] : row.activity;
    return activity ? [activity] : [];
  });

  const rounds = (roundsRes.data || []).map((row: any) => ({
    id: row.id,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    floor: row.floor_number,
    doctor: Array.isArray(row.doctor) ? row.doctor[0]?.full_name : row.doctor?.full_name,
  }));

  const events = [
    ...(appointmentsRes.data || []).map((item: any) => ({ id: `a-${item.id}`, time: item.starts_at, end: item.ends_at, label: item.title, meta: item.location || "Rendez-vous", kind: "RDV", href: "/portal/appointments" })),
    ...activityItems.map((item: any) => ({ id: `act-${item.id}`, time: item.starts_at, end: item.ends_at, label: item.title, meta: item.location || "Activité", kind: "ACTIVITÉ", href: "/portal/activities" })),
    ...(permissionsRes.data || []).filter((item: any) => ["approved", "departed", "pending"].includes(item.status)).map((item: any) => ({ id: `p-${item.id}`, time: item.departure_at, end: item.return_at, label: "Permission de sortie", meta: item.status === "pending" ? "En attente" : "Autorisée", kind: "PERMISSION", href: "/portal/permissions" })),
    ...rounds.map((item: any) => ({ id: `r-${item.id}`, time: item.scheduledAt, end: null, label: "Passage du médecin", meta: `Étage ${item.floor}${item.doctor ? ` · ${item.doctor}` : ""}`, kind: "MÉDECIN", href: "/portal/appointments" })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index);
    return { date, events: events.filter((event) => dateKey(event.time, timezone) === date) };
  });

  const localHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(now));
  const mealOrder = [{ meal: "breakfast", hour: 8, label: "Petit-déjeuner" }, { meal: "lunch", hour: 12, label: "Déjeuner" }, { meal: "dinner", hour: 19, label: "Dîner" }];
  let mealDate = today;
  let meal = mealOrder.find((item) => localHour < item.hour);
  if (!meal) { meal = mealOrder[0]; mealDate = addDays(today, 1); }
  const menu = (menusRes.data || []).find((item: any) => item.service_date === mealDate && item.meal === meal?.meal);

  const roster = rosterRes.data?.[0] as any;
  const refDoctor = roster ? (Array.isArray(roster.reference_doctor) ? roster.reference_doctor[0] : roster.reference_doctor) : null;
  const nextRound = rounds.find((round: any) => new Date(round.scheduledAt).getTime() >= Date.now()) || null;

  return NextResponse.json({
    timezone,
    locale,
    today,
    days,
    nextRound,
    nextMeal: meal ? { label: meal.label, hour: meal.hour, description: menu?.description || "Menu à confirmer", date: mealDate } : null,
    referenceDoctor: refDoctor ? { fullName: refDoctor.full_name, specialty: refDoctor.specialty } : null,
    stay: stayRes.data?.[0] || null,
  });
}
