"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  ["/portal", "/portal/handoff", "/portal/pulse"].forEach((path) => revalidatePath(path));
}

export async function submitPatientHelp(category: "room" | "meal" | "planning" | "admin", message: string) {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Action réservée au patient." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_patient_service_request", { p_category: category, p_message: message.trim() || null });
  if (error) return { error: error.message };
  refresh();
  return { success: "Votre demande a été transmise à l’équipe." };
}

export async function completePatientHelp(id: string) {
  const profile = await requireProfile();
  if (!["reception", "manager", "nurse", "governance", "admin"].includes(profile.role)) return { error: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_patient_service_request", { p_id: id });
  if (error) return { error: error.message };
  refresh();
  return { success: "Demande clôturée." };
}

export async function submitDailyFeedback(mood: 1 | 2 | 3, comment: string) {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Action réservée au patient." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_patient_daily_feedback", { p_mood: mood, p_comment: comment.trim() || null });
  if (error) return { error: error.message };
  refresh();
  return { success: "Merci, votre retour d’expérience est enregistré." };
}
