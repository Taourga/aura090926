"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { AppRole } from "@/lib/types";

type ActionResult = { error?: string; success?: string };

function refreshPortal() {
  ["/portal", "/portal/patients", "/portal/permissions", "/portal/activities", "/portal/appointments", "/portal/information", "/portal/menus", "/portal/sport-room", "/portal/admin"].forEach((path) => revalidatePath(path));
}

export async function submitPermission(input: { departureAt: string; returnAt: string; reason: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Cette action est réservée aux patients." };
  if (!input.departureAt || !input.returnAt || new Date(input.returnAt) <= new Date(input.departureAt)) {
    return { error: "Le retour doit être postérieur au départ." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_permission_request", {
    p_departure_at: input.departureAt,
    p_return_at: input.returnAt,
    p_reason: input.reason.trim() || null,
  });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Votre demande a été transmise au médecin et au cadre." };
}

export async function decidePermission(permissionId: string, decision: "approved" | "refused", comment?: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "doctor" && profile.role !== "manager") return { error: "Vous n’êtes pas autorisé à décider cette permission." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_permission_request", {
    p_permission_id: permissionId,
    p_decision: decision,
    p_comment: comment?.trim() || null,
  });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: decision === "approved" ? "Validation enregistrée." : "Refus enregistré." };
}

export async function recordMovement(permissionId: string, action: "depart" | "return"): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "reception") return { error: "Cette action est réservée à l’accueil." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_permission_movement", {
    p_permission_id: permissionId,
    p_action: action,
  });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: action === "depart" ? "Sortie réelle enregistrée." : "Retour réel enregistré." };
}

export async function enrollActivity(activityId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Seul le patient peut s’inscrire à une activité." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_in_activity", { p_activity_id: activityId });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Votre inscription est confirmée." };
}

export async function cancelActivityEnrollment(activityId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("activity_enrollments").delete().eq("activity_id", activityId).eq("patient_id", profile.id);
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Votre désinscription est enregistrée." };
}

export async function createAppointment(input: { patientId: string; title: string; startsAt: string; endsAt: string; location: string; notes: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!(["doctor", "manager", "psychologist", "provider"] as AppRole[]).includes(profile.role)) return { error: "Vous n’êtes pas autorisé à créer un rendez-vous." };
  if (!input.patientId || !input.title.trim() || !input.startsAt || !input.endsAt || new Date(input.endsAt) <= new Date(input.startsAt)) return { error: "Vérifiez le patient, l’intitulé et les horaires." };
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    patient_id: input.patientId,
    creator_id: profile.id,
    title: input.title.trim(),
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: input.location.trim() || null,
    notes: input.notes.trim() || null,
  });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le rendez-vous a été ajouté au planning du patient." };
}

export async function scheduleDoctorRound(input: { floorNumber: number; scheduledAt: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return { error: "Cette action est réservée au médecin." };
  if (![0, 1, 2, 3].includes(input.floorNumber) || !input.scheduledAt) return { error: "Choisissez un étage et une heure de passage." };
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return { error: "L'heure de passage doit être dans le futur." };
  const supabase = await createClient();
  const { error } = await supabase.from("doctor_rounds").insert({
    doctor_id: profile.id,
    floor_number: input.floorNumber,
    scheduled_at: scheduledAt.toISOString(),
  });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "L'heure de passage est publiée pour les patients de cet étage." };
}

export async function createExternalAppointment(input: { startsAt: string; endsAt: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return { error: "Cette action est réservée au médecin." };
  if (!input.startsAt || !input.endsAt || new Date(input.endsAt) <= new Date(input.startsAt)) return { error: "Vérifiez les horaires du rendez-vous externe." };
  const supabase = await createClient();
  const { error } = await supabase.from("doctor_schedule_blocks").insert({
    doctor_id: profile.id,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le créneau externe a été ajouté sans détail patient." };
}

export async function publishInformation(input: { title: string; body: string; startsAt?: string; endsAt?: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "governance" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à publier une information." };
  if (!input.title.trim() || !input.body.trim()) return { error: "Le titre et le contenu sont obligatoires." };
  const supabase = await createClient();
  const { error } = await supabase.from("information_posts").insert({
    title: input.title.trim(), body: input.body.trim(), author_id: profile.id,
    starts_at: input.startsAt || null, ends_at: input.endsAt || null, published: true,
  });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "L’information est publiée." };
}

export async function addMenuItem(input: { serviceDate: string; meal: string; description: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "governance" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à gérer les menus." };
  if (!input.serviceDate || !input.meal || !input.description.trim()) return { error: "Tous les champs sont obligatoires." };
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").upsert({ service_date: input.serviceDate, meal: input.meal, description: input.description.trim() }, { onConflict: "service_date,meal" });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le menu est enregistré." };
}

export async function updateSportRoomSchedule(input: { scheduleDate: string; opensAt: string; closesAt: string; note: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "coach" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à modifier le planning de la salle." };
  if (!input.scheduleDate || !input.opensAt || !input.closesAt || input.closesAt <= input.opensAt) {
    return { error: "L’horaire de fermeture doit être postérieur à l’ouverture." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sport_room_schedules").upsert({
    schedule_date: input.scheduleDate,
    opens_at: input.opensAt,
    closes_at: input.closesAt,
    note: input.note.trim() || null,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "schedule_date" });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le planning de la salle de sport est mis à jour." };
}

export async function updateUser(input: { userId: string; role: AppRole; active: boolean }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Action réservée à l’administrateur." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: input.role, active: input.active }).eq("id", input.userId);
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le profil est mis à jour." };
}
