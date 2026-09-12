"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { facilityFeatureEnabled, facilitySettingNumber, requireProfile } from "@/lib/auth";
import { sendPatientUpdateEmails, type NotificationRecipient } from "@/lib/patient-notifications";
import type { AppRole, AttendanceStatus, CountryPackCode, FacilityConfig } from "@/lib/types";

type ActionResult = { error?: string; success?: string; facilityId?: string };

function refreshPortal() {
  ["/portal", "/portal/patients", "/portal/permissions", "/portal/activities", "/portal/appointments", "/portal/messages", "/portal/visits", "/portal/information", "/portal/menus", "/portal/sport-room", "/portal/housekeeping", "/portal/admin"].forEach((path) => revalidatePath(path));
}

async function notifyPatients(supabase: Awaited<ReturnType<typeof createClient>>, subject: string, patientId?: string) {
  const { data } = await supabase.rpc("notification_recipients", { p_patient_id: patientId || null });
  await sendPatientUpdateEmails((data || []) as NotificationRecipient[], subject);
}

export async function switchFacility(facilityId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!profile.facilities.some((facility) => facility.id === facilityId)) return { error: "Établissement non autorisé." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("switch_facility", { p_facility_id: facilityId });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Établissement actif modifié." };
}

export async function submitPermission(input: { departureAt: string; returnAt: string; reason: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "permissions")) return { error: "Le module Permissions est désactivé pour cet établissement." };
  if (profile.role !== "patient") return { error: "Cette action est réservée aux patients." };
  if (!input.departureAt || !input.returnAt || new Date(input.returnAt) <= new Date(input.departureAt)) return { error: "Le retour doit être postérieur au départ." };
  const noticeHours = facilitySettingNumber(profile, "permissions.min_notice_hours", 48);
  if (new Date(input.departureAt).getTime() < Date.now() + noticeHours * 60 * 60 * 1000) return { error: `La demande doit être envoyée au moins ${noticeHours} heures avant le départ souhaité.` };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_permission_request", { p_departure_at: input.departureAt, p_return_at: input.returnAt, p_reason: input.reason.trim() || null });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Votre demande a été transmise au médecin et au cadre." };
}

export async function decidePermission(permissionId: string, decision: "approved" | "refused", comment?: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "doctor" && profile.role !== "manager") return { error: "Vous n’êtes pas autorisé à décider cette permission." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_permission_request", { p_permission_id: permissionId, p_decision: decision, p_comment: comment?.trim() || null });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: decision === "approved" ? "Validation enregistrée." : "Refus enregistré." };
}

export async function recordMovement(permissionId: string, action: "depart" | "return"): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "reception") return { error: "Cette action est réservée à l’accueil." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_permission_movement", { p_permission_id: permissionId, p_action: action });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: action === "depart" ? "Sortie réelle enregistrée." : "Retour réel enregistré." };
}

export async function enrollActivity(activityId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "activities")) return { error: "Le module Activités est désactivé." };
  if (profile.role !== "patient") return { error: "Seul le patient peut s’inscrire à une activité." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_in_activity", { p_activity_id: activityId });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Votre inscription est confirmée." };
}

export async function cancelActivityEnrollment(activityId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "activities")) return { error: "Le module Activités est désactivé." };
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
  const { error } = await supabase.rpc("create_appointment_checked", { p_patient_id: input.patientId, p_title: input.title.trim(), p_starts_at: input.startsAt, p_ends_at: input.endsAt, p_location: input.location.trim() || null, p_notes: input.notes.trim() || null });
  if (error) return { error: error.message };
  await notifyPatients(supabase, "Votre planning AURA a été mis à jour.", input.patientId);
  refreshPortal();
  return { success: "Le rendez-vous a été ajouté au planning du patient." };
}

export async function createActivity(input: { title: string; description: string; startsAt: string; endsAt: string; location: string; capacity: number }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "activities")) return { error: "Le module Activités est désactivé." };
  if (profile.role !== "governance" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à ajouter une activité." };
  if (!input.title.trim() || !input.startsAt || !input.endsAt || !Number.isInteger(input.capacity) || input.capacity < 1 || new Date(input.endsAt) <= new Date(input.startsAt)) return { error: "Vérifiez le titre, les horaires et le nombre de places." };
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({ title: input.title.trim(), description: input.description.trim() || null, starts_at: input.startsAt, ends_at: input.endsAt, location: input.location.trim() || null, capacity: input.capacity, active: true });
  if (error) return { error: error.message };
  await notifyPatients(supabase, "Une nouvelle activité est disponible dans AURA.");
  refreshPortal();
  return { success: "L’activité est publiée." };
}

export async function markAppointmentAttendance(appointmentId: string, status: AttendanceStatus): Promise<ActionResult> {
  await requireProfile();
  if (!["present", "absent"].includes(status)) return { error: "Statut de présence invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_appointment_attendance", { p_appointment_id: appointmentId, p_status: status });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: status === "present" ? "Présence enregistrée." : "Absence enregistrée." };
}

export async function markActivityAttendance(enrollmentId: string, status: AttendanceStatus): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "activities")) return { error: "Le module Activités est désactivé." };
  if (!["doctor", "manager", "psychologist", "provider", "governance", "coach", "admin"].includes(profile.role)) return { error: "Vous n’êtes pas autorisé à enregistrer une présence." };
  if (!["present", "absent"].includes(status)) return { error: "Statut de présence invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_activity_attendance", { p_enrollment_id: enrollmentId, p_status: status });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: status === "present" ? "Présence enregistrée." : "Absence enregistrée." };
}

export async function submitVisit(input: { startsAt: string; endsAt: string; visitorOneName: string; visitorTwoName: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "visits")) return { error: "Le module Visites est désactivé." };
  if (profile.role !== "patient") return { error: "Seul le patient peut prévenir l’accueil d’une visite." };
  if (!input.startsAt || !input.endsAt || !input.visitorOneName.trim()) return { error: "Indiquez au moins un visiteur ainsi que le créneau souhaité." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_visit_notification", { p_starts_at: input.startsAt, p_ends_at: input.endsAt, p_visitor_one_name: input.visitorOneName.trim(), p_visitor_two_name: input.visitorTwoName.trim() || null });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Votre visite a été transmise à l’accueil." };
}

export async function recordVisitMovement(visitId: string, action: "arrive" | "depart"): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "reception") return { error: "Cette action est réservée à l’accueil." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_visit_movement", { p_visit_id: visitId, p_action: action });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: action === "arrive" ? "Entrée du visiteur enregistrée." : "Départ du visiteur enregistré." };
}

export async function scheduleDoctorRound(input: { floorNumber: number; scheduledAt: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return { error: "Cette action est réservée au médecin." };
  if (![0, 1, 2, 3].includes(input.floorNumber) || !input.scheduledAt) return { error: "Choisissez un étage et une heure de passage." };
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return { error: "L'heure de passage doit être dans le futur." };
  const supabase = await createClient();
  const { error } = await supabase.from("doctor_rounds").insert({ doctor_id: profile.id, floor_number: input.floorNumber, scheduled_at: scheduledAt.toISOString() });
  if (error) return { error: error.message };
  await notifyPatients(supabase, "Votre planning AURA a été mis à jour.");
  refreshPortal();
  return { success: "L'heure de passage est publiée pour les patients de cet étage." };
}

export async function createExternalAppointment(input: { startsAt: string; endsAt: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return { error: "Cette action est réservée au médecin." };
  if (!input.startsAt || !input.endsAt || new Date(input.endsAt) <= new Date(input.startsAt)) return { error: "Vérifiez les horaires du rendez-vous externe." };
  const supabase = await createClient();
  const { error } = await supabase.from("doctor_schedule_blocks").insert({ doctor_id: profile.id, starts_at: input.startsAt, ends_at: input.endsAt });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le créneau externe a été ajouté sans détail patient." };
}

export async function publishInformation(input: { title: string; body: string; startsAt?: string; endsAt?: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "information")) return { error: "Le module Informations est désactivé." };
  if (profile.role !== "governance" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à publier une information." };
  if (!input.title.trim() || !input.body.trim()) return { error: "Le titre et le contenu sont obligatoires." };
  const supabase = await createClient();
  const { error } = await supabase.from("information_posts").insert({ title: input.title.trim(), body: input.body.trim(), author_id: profile.id, starts_at: input.startsAt || null, ends_at: input.endsAt || null, published: true });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "L’information est publiée." };
}

export async function addMenuItem(input: { serviceDate: string; meal: string; description: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "menus")) return { error: "Le module Menus est désactivé." };
  if (profile.role !== "governance" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à gérer les menus." };
  if (!input.serviceDate || !input.meal || !input.description.trim()) return { error: "Tous les champs sont obligatoires." };
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").upsert({ facility_id: profile.facility.id, service_date: input.serviceDate, meal: input.meal, description: input.description.trim() }, { onConflict: "facility_id,service_date,meal" });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le menu est enregistré." };
}

export async function updateSportRoomSchedule(input: { scheduleDate: string; opensAt: string; closesAt: string; note: string }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "sport")) return { error: "Le module Salle de sport est désactivé." };
  if (profile.role !== "coach" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à modifier le planning de la salle." };
  if (!input.scheduleDate || !input.opensAt || !input.closesAt || input.closesAt <= input.opensAt) return { error: "L’horaire de fermeture doit être postérieur à l’ouverture." };
  const supabase = await createClient();
  const { error } = await supabase.from("sport_room_schedules").upsert({ facility_id: profile.facility.id, schedule_date: input.scheduleDate, opens_at: input.opensAt, closes_at: input.closesAt, note: input.note.trim() || null, updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: "facility_id,schedule_date" });
  if (error) return { error: error.message };
  await notifyPatients(supabase, "Le planning de la salle de sport a été mis à jour.");
  refreshPortal();
  return { success: "Le planning de la salle de sport est mis à jour." };
}

export async function updateUser(input: { userId: string; role: AppRole; active: boolean }): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Action réservée à l’administrateur." };
  const supabase = await createClient();
  const { error } = await supabase.from("facility_memberships").update({ role: input.role, active: input.active }).eq("facility_id", profile.facility.id).eq("user_id", input.userId);
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Le rôle et l’accès à cette clinique sont mis à jour." };
}

export async function updateFacilitySettings(settings: FacilityConfig): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Action réservée à l’administrateur." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_current_facility_settings", { p_settings: settings });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Configuration de l’établissement enregistrée." };
}

export async function applyCountryPack(pack: CountryPackCode): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Action réservée à l’administrateur." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_country_pack", { p_pack_code: pack, p_keep_overrides: false });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: `Country Pack ${pack} appliqué.` };
}

export async function inviteFacilityMember(email: string, role: AppRole): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Action réservée à l’administrateur." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_facility_member", { p_email: email.trim(), p_role: role });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Invitation enregistrée. Si le compte existe déjà, l’accès est actif immédiatement." };
}

export async function createFacility(name: string, pack: CountryPackCode): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Action réservée à l’administrateur." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_facility_for_current_org", { p_name: name.trim(), p_pack_code: pack });
  if (error) return { error: error.message };
  refreshPortal();
  return { success: "Nouvel établissement créé. Il est disponible dans le sélecteur AURA.", facilityId: data as string };
}
