"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { facilityFeatureEnabled, facilitySettingNumber, requireProfile } from "@/lib/auth";

type Result = { error?: string; success?: string };

function refresh() {
  revalidatePath("/portal");
  revalidatePath("/portal/permissions");
  revalidatePath("/portal/appointments");
  revalidatePath("/portal/pulse");
}

function validateWindow(departureAt: string, returnAt: string) {
  const departure = new Date(departureAt);
  const returned = new Date(returnAt);
  if (!departureAt || !returnAt || Number.isNaN(departure.getTime()) || Number.isNaN(returned.getTime())) return "Vérifiez les horaires de la permission.";
  if (returned <= departure) return "Le retour doit être postérieur au départ.";
  if (returned.getTime() - departure.getTime() > 24 * 60 * 60 * 1000) return "Une permission peut durer au maximum 24 heures (une seule nuit).";
  return null;
}

export async function createCalendarPermission(input: { departureAt: string; returnAt: string; reason: string }): Promise<Result> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Cette action est réservée au patient." };
  if (!facilityFeatureEnabled(profile, "permissions")) return { error: "Le module Permissions est désactivé." };
  const invalid = validateWindow(input.departureAt, input.returnAt);
  if (invalid) return { error: invalid };
  const noticeHours = facilitySettingNumber(profile, "permissions.min_notice_hours", 48);
  if (new Date(input.departureAt).getTime() < Date.now() + noticeHours * 60 * 60 * 1000) return { error: `La demande doit être envoyée au moins ${noticeHours} heures avant le départ.` };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_permission_request", { p_departure_at: input.departureAt, p_return_at: input.returnAt, p_reason: input.reason.trim() || null });
  if (error) return { error: error.message };
  refresh();
  return { success: "Votre demande a été envoyée au médecin et au cadre." };
}

export async function updateCalendarPermission(input: { permissionId: string; departureAt: string; returnAt: string; reason: string }): Promise<Result> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Cette action est réservée au patient." };
  const invalid = validateWindow(input.departureAt, input.returnAt);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_permission_request", { p_permission_id: input.permissionId, p_departure_at: input.departureAt, p_return_at: input.returnAt, p_reason: input.reason.trim() || null });
  if (error) return { error: error.message };
  refresh();
  return { success: "Votre demande a été modifiée. Les validations repartent à zéro." };
}

export async function cancelCalendarPermission(permissionId: string): Promise<Result> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return { error: "Cette action est réservée au patient." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_permission_request", { p_permission_id: permissionId });
  if (error) return { error: error.message };
  refresh();
  return { success: "La permission a été annulée." };
}
