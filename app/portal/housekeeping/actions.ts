"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validServiceDate } from "@/lib/housekeeping";

export async function completeCleaning(taskId: string) {
  const profile = await requireProfile();
  if (profile.role !== "technical") return { error: "Action réservée au personnel technique." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("housekeeping_complete", { p_task: taskId });
  if (error) return { error: error.message };
  revalidatePath("/portal/housekeeping");
  return { success: "Nettoyage validé et horodaté." };
}

export async function saveRoster(date: string, floors: string[], lifts: string[]) {
  const profile = await requireProfile();
  if (!["governance", "admin"].includes(profile.role)) return { error: "Action réservée au gouvernant." };
  if (!validServiceDate(date)) return { error: "Date invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("housekeeping_save_roster", { p_date: date, p_floors: floors, p_lifts: lifts });
  if (error) return { error: error.message };
  revalidatePath("/portal/housekeeping");
  return { success: "Affectations enregistrées. Elles s’appliquent à partir de cette date, jusqu’au prochain changement." };
}
