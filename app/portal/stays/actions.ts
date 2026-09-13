"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/portal", "layout");
  revalidatePath("/portal/pulse");
  revalidatePath("/portal/discharges");
}
export async function createAdmission(patient: string, room: string, expected: string) {
  const profile = await requireProfile();
  if (!["reception", "admin"].includes(profile.role)) return { error: "Action réservée aux admissions." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("plan_admission", { p_patient: patient, p_room: room, p_expected: expected });
  if (error) return { error: error.message };
  refresh();
  return { success: "Première entrée prévue enregistrée." };
}
export async function admissionAction(id: string, action: "arrive" | "cancel") {
  const profile = await requireProfile();
  if (!["reception", "admin"].includes(profile.role)) return { error: "Action réservée aux admissions." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("manage_admission", { p_id: id, p_action: action });
  if (error) return { error: error.message };
  refresh();
  return { success: action === "arrive" ? "Entrée réelle enregistrée, séjour ouvert." : "Admission annulée." };
}
export async function dischargeAction(stay: string, expected: string, confirm: boolean) {
  const profile = await requireProfile();
  if (!["doctor", "nurse", "admin"].includes(profile.role)) return { error: "Action réservée aux médecins et infirmiers." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("plan_discharge", { p_stay: stay, p_expected: expected, p_confirm: confirm });
  if (error) return { error: error.message };
  refresh();
  return { success: confirm ? "Sortie définitive enregistrée, chambre libérée." : "Prévision de sortie mise à jour." };
}
