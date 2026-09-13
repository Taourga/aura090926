"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ScopeKey = "presence" | "planning" | "permissions" | "activities" | "visits" | "menus" | "information" | "discharge";
type ScopeMap = Record<ScopeKey, boolean>;

type ActionResult = { error?: string; success?: string };

export async function updateTrustedContactAccess(patientId: string, enabled: boolean, scopes: ScopeMap): Promise<ActionResult> {
  const profile = await requireProfile();
  const allowedStaff = ["doctor", "nurse", "manager", "admin"].includes(profile.role);
  if (!(profile.role === "patient" && profile.id === patientId) && !allowedStaff) return { error: "Vous n’êtes pas autorisé à modifier cet accès." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("manage_trusted_contact_access", {
    p_patient_id: patientId,
    p_enabled: enabled,
    p_scopes: scopes,
  });
  if (error) return { error: error.message };

  revalidatePath("/portal/contacts");
  revalidatePath("/portal/proche");
  return { success: enabled ? "Accès du proche mis à jour." : "Accès du proche révoqué immédiatement." };
}
