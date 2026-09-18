import { supabase } from "./supabase";
import type {
  ActivityItem,
  PatientContext,
  PermissionItem,
  PlanningEvent,
  VisitItem,
} from "./types";

type FacilityRpcRow = {
  facility_id: string;
  facility_name: string;
  timezone: string;
  default_locale: string;
  role: PatientContext["facility"]["role"];
  is_active: boolean;
};

export async function loadPatientContext(): Promise<PatientContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Session AURA invalide.");

  const user = userData.user;
  const [profileRes, facilitiesRes, configRes, stayRes] = await Promise.all([
    supabase.from("profiles").select("id,full_name,active,phone").eq("id", user.id).single(),
    supabase.rpc("get_my_facilities"),
    supabase.rpc("facility_effective_config", { p_facility_id: null }),
    supabase
      .from("patient_stays")
      .select("room_number,presence,planned_discharge_at")
      .eq("patient_id", user.id)
      .is("ended_at", null)
      .maybeSingle(),
  ]);

  if (profileRes.error || !profileRes.data?.active) {
    throw new Error("Votre compte AURA n'est pas actif.");
  }

  const facilityRows = (facilitiesRes.data || []) as FacilityRpcRow[];
  const facility = facilityRows.find((row) => row.is_active);
  if (!facility) throw new Error("Aucun établissement AURA actif n'est associé à ce compte.");
  if (facility.role !== "patient") {
    throw new Error("Ce MVP mobile est réservé au profil Patient.");
  }

  return {
    id: user.id,
    fullName: profileRes.data.full_name,
    phone: profileRes.data.phone,
    facility: {
      id: facility.facility_id,
      name: facility.facility_name,
      timezone: facility.timezone || "Europe/Paris",
      locale: facility.default_locale || "fr-FR",
      role: facility.role,
    },
    facilityConfig: (configRes.data || {}) as Record<string, unknown>,
    stay: stayRes.data || null,
  };
}

export function facilityNumber(context: PatientContext, key: string, fallback: number) {
  const value = context.facilityConfig[key];
  return typeof value === "number" ? value : fallback;
}

export function facilityText(context: PatientContext, key: string, fallback: string) {
  const value = context.facilityConfig[key];
  return typeof value === "string" ? value : fallback;
}

export function formatDateTime(value: string, context: PatientContext) {
  return new Intl.DateTimeFormat(context.facility.locale || "fr-FR", {
    timeZone: context.facility.timezone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateOnly(value: string, context: PatientContext) {
  return new Intl.DateTimeFormat(context.facility.locale || "fr-FR", {
    timeZone: context.facility.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

export function dateKey(value: string, context: PatientContext) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: context.facility.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function todayKey(context: PatientContext) {
  return dateKey(new Date().toISOString(), context);
}

function addDaysToKey(key: string, days: number) {
  const date = new Date(key + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultFutureDate(context: PatientContext, days = 2) {
  return addDaysToKey(todayKey(context), days);
}

export function zonedDateTimeToIso(date: string, time: string, timeZone: string) {
  const dateParts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2 || dateParts.some(Number.isNaN) || timeParts.some(Number.isNaN)) {
    throw new Error("Date ou heure invalide.");
  }

  const targetUtc = Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0);
  let guess = targetUtc;

  for (let i = 0; i < 3; i += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");
    const representedUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), 0);
    const diff = targetUtc - representedUtc;
    if (Math.abs(diff) < 1000) break;
    guess += diff;
  }

  return new Date(guess).toISOString();
}

export async function fetchPlanning(context: PatientContext, days = 7): Promise<PlanningEvent[]> {
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const rangeEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const [appointmentsRes, permissionsRes, enrollmentsRes, visitsRes, roundsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id,title,starts_at,ends_at,location")
      .eq("patient_id", context.id)
      .gte("starts_at", rangeStart)
      .lte("starts_at", rangeEnd)
      .order("starts_at")
      .limit(80),
    supabase
      .from("permission_requests")
      .select("id,departure_at,return_at,status")
      .eq("patient_id", context.id)
      .gte("return_at", rangeStart)
      .lte("departure_at", rangeEnd)
      .order("departure_at")
      .limit(50),
    supabase
      .from("activity_enrollments")
      .select("id,activity:activities!inner(id,title,starts_at,ends_at,location)")
      .eq("patient_id", context.id)
      .gte("activity.starts_at", rangeStart)
      .lte("activity.starts_at", rangeEnd)
      .limit(80),
    supabase
      .from("visit_notifications")
      .select("id,scheduled_start,scheduled_end,visitor_one_name,status")
      .eq("patient_id", context.id)
      .neq("status", "cancelled")
      .gte("scheduled_end", rangeStart)
      .lte("scheduled_start", rangeEnd)
      .order("scheduled_start")
      .limit(50),
    supabase
      .from("doctor_rounds")
      .select("id,scheduled_at,floor_number,doctor:profiles!doctor_rounds_doctor_id_fkey(full_name)")
      .gte("scheduled_at", rangeStart)
      .lte("scheduled_at", rangeEnd)
      .order("scheduled_at")
      .limit(40),
  ]);

  const errors = [appointmentsRes.error, permissionsRes.error, enrollmentsRes.error, visitsRes.error, roundsRes.error].filter(Boolean);
  if (errors.length) throw new Error(errors[0]?.message || "Impossible de charger le planning.");

  const activities = (enrollmentsRes.data || []).flatMap((row: any) => {
    const relation = Array.isArray(row.activity) ? row.activity[0] : row.activity;
    return relation ? [relation] : [];
  });

  const events: PlanningEvent[] = [
    ...(appointmentsRes.data || []).map((item: any) => ({
      id: "a-" + item.id,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      title: item.title,
      meta: item.location || "Rendez-vous",
      kind: "RDV" as const,
    })),
    ...activities.map((item: any) => ({
      id: "act-" + item.id,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      title: item.title,
      meta: item.location || "Activité",
      kind: "ACTIVITÉ" as const,
    })),
    ...(visitsRes.data || []).map((item: any) => ({
      id: "v-" + item.id,
      startsAt: item.scheduled_start,
      endsAt: item.scheduled_end,
      title: "Visite de " + item.visitor_one_name,
      meta: item.status === "arrived" ? "Visite en cours" : "Visite prévue",
      kind: "VISITE" as const,
    })),
    ...(permissionsRes.data || [])
      .filter((item: any) => !["refused", "cancelled", "returned"].includes(item.status))
      .map((item: any) => ({
        id: "p-" + item.id,
        startsAt: item.departure_at,
        endsAt: item.return_at,
        title: "Permission de sortie",
        meta: ["submitted", "waiting"].includes(item.status) ? "En attente de validation" : "Autorisée",
        kind: "PERMISSION" as const,
      })),
    ...(roundsRes.data || []).map((item: any) => {
      const doctor = Array.isArray(item.doctor) ? item.doctor[0] : item.doctor;
      return {
        id: "r-" + item.id,
        startsAt: item.scheduled_at,
        endsAt: null,
        title: "Passage du médecin",
        meta: (doctor?.full_name ? doctor.full_name + " · " : "") + "Étage " + item.floor_number,
        kind: "MÉDECIN" as const,
      };
    }),
  ];

  return events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function fetchActivities(context: PatientContext): Promise<ActivityItem[]> {
  const now = new Date().toISOString();
  const [activitiesRes, enrollmentsRes] = await Promise.all([
    supabase
      .from("activities")
      .select("id,title,description,starts_at,ends_at,location,capacity,requires_prescription,active")
      .eq("active", true)
      .gte("ends_at", now)
      .order("starts_at")
      .limit(80),
    supabase
      .from("activity_enrollments")
      .select("activity_id,attendance_status")
      .eq("patient_id", context.id),
  ]);

  if (activitiesRes.error) throw new Error(activitiesRes.error.message);
  if (enrollmentsRes.error) throw new Error(enrollmentsRes.error.message);

  const enrollmentMap = new Map(
    (enrollmentsRes.data || []).map((item: any) => [item.activity_id, item.attendance_status]),
  );

  return (activitiesRes.data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    startsAt: item.starts_at,
    endsAt: item.ends_at,
    location: item.location,
    capacity: item.capacity,
    requiresPrescription: Boolean(item.requires_prescription),
    enrolled: enrollmentMap.has(item.id),
    attendanceStatus: enrollmentMap.get(item.id) || null,
  }));
}

export async function enrollActivity(context: PatientContext, activityId: string) {
  const { error } = await supabase.rpc("enroll_in_activity", { p_activity_id: activityId });
  if (error) throw new Error(error.message);
  return fetchActivities(context);
}

export async function cancelActivity(context: PatientContext, activityId: string) {
  const { error } = await supabase
    .from("activity_enrollments")
    .delete()
    .eq("activity_id", activityId)
    .eq("patient_id", context.id);
  if (error) throw new Error(error.message);
  return fetchActivities(context);
}

export async function fetchVisits(context: PatientContext): Promise<VisitItem[]> {
  const { data, error } = await supabase
    .from("visit_notifications")
    .select("id,scheduled_start,scheduled_end,visitor_one_name,visitor_two_name,status")
    .eq("patient_id", context.id)
    .order("scheduled_start", { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  return (data || []).map((item: any) => ({
    id: item.id,
    scheduledStart: item.scheduled_start,
    scheduledEnd: item.scheduled_end,
    visitorOneName: item.visitor_one_name,
    visitorTwoName: item.visitor_two_name,
    status: item.status,
  }));
}

export async function submitVisit(input: {
  startsAt: string;
  endsAt: string;
  visitorOneName: string;
  visitorTwoName?: string;
}) {
  const { error } = await supabase.rpc("submit_visit_notification", {
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_visitor_one_name: input.visitorOneName.trim(),
    p_visitor_two_name: input.visitorTwoName?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchPermissions(context: PatientContext): Promise<PermissionItem[]> {
  const { data, error } = await supabase
    .from("permission_requests")
    .select("id,departure_at,return_at,reason,status,doctor_decision,manager_decision")
    .eq("patient_id", context.id)
    .order("departure_at", { ascending: false })
    .limit(80);

  if (error) throw new Error(error.message);
  return (data || []).map((item: any) => ({
    id: item.id,
    departureAt: item.departure_at,
    returnAt: item.return_at,
    reason: item.reason,
    status: item.status,
    doctorDecision: item.doctor_decision,
    managerDecision: item.manager_decision,
  }));
}

export async function submitPermission(input: {
  departureAt: string;
  returnAt: string;
  reason: string;
}) {
  const { error } = await supabase.rpc("submit_permission_request", {
    p_departure_at: input.departureAt,
    p_return_at: input.returnAt,
    p_reason: input.reason.trim() || null,
  });
  if (error) throw new Error(error.message);
}
