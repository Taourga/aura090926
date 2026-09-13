"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; success?: string };

export async function requestSituationBulletin(): Promise<Result> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Action réservée au patient." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_situation_bulletin");
  if (error) return { error: error.message };
  revalidatePath("/portal");
  return { success: "Demande envoyée à l’accueil. Vous serez informé dès qu’elle sera traitée." };
}

export async function processSituationBulletin(requestId: string, action: "generate" | "send"): Promise<Result> {
  const profile = await requireProfile();
  if (!["reception", "admin"].includes(profile.role)) return { error: "Action réservée à l’accueil." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("process_situation_bulletin", { p_request_id: requestId, p_action: action });
  if (error) return { error: error.message };
  revalidatePath("/portal");
  return { success: action === "generate" ? "Bulletin généré." : "Envoi placé dans la file email de l’établissement." };
}

export async function publishActivityUpdate(activityId: string, updateType: "absence" | "change" | "information", message: string): Promise<Result> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_activity_update", { p_activity_id: activityId, p_update_type: updateType, p_message: message });
  if (error) return { error: error.message };
  revalidatePath("/portal");
  revalidatePath("/portal/activities");
  return { success: "Information publiée aux patients inscrits." };
}

export async function publishDoctorAbsence(input: { startsAt: string; endsAt: string; reason: string; replacementDoctorId?: string }): Promise<Result> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return { error: "Action réservée au médecin." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_doctor_absence", {
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_reason: input.reason,
    p_replacement_doctor_id: input.replacementDoctorId || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal");
  revalidatePath("/portal/patients");
  return { success: "Absence enregistrée et visible pour les patients concernés." };
}
