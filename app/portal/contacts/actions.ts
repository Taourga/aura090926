"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ScopeKey = "presence" | "planning" | "permissions" | "activities" | "visits" | "menus" | "information" | "discharge";
type ScopeMap = Record<ScopeKey, boolean>;
type NotificationKey = "presence" | "planning" | "permissions" | "visits" | "discharge";
type NotificationMap = Record<NotificationKey, boolean>;
type ActionResult = { error?: string; success?: string };

function canManage(profile: Awaited<ReturnType<typeof requireProfile>>, patientId: string) {
  const allowedStaff = ["doctor", "nurse", "manager", "admin"].includes(profile.role);
  return (profile.role === "patient" && profile.id === patientId) || allowedStaff;
}

export async function updateTrustedContactAccess(patientId: string, enabled: boolean, scopes: ScopeMap): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!canManage(profile, patientId)) return { error: "Vous n’êtes pas autorisé à modifier cet accès." };

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

export async function updateTrustedContactPreferences(input: {
  patientId: string;
  notifications: NotificationMap;
  accessExpiresAt: string;
  emergencyContact: boolean;
  preferredContactMethod: "email" | "sms" | "none";
}): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!canManage(profile, input.patientId)) return { error: "Vous n’êtes pas autorisé à modifier ces préférences." };
  const supabase = await createClient();
  const expires = input.accessExpiresAt ? new Date(input.accessExpiresAt) : null;
  if (expires && Number.isNaN(expires.getTime())) return { error: "Date de fin d’accès invalide." };

  const { error } = await supabase.rpc("update_trusted_contact_preferences", {
    p_patient_id: input.patientId,
    p_notification_preferences: input.notifications,
    p_access_expires_at: expires ? expires.toISOString() : null,
    p_is_emergency_contact: input.emergencyContact,
    p_preferred_contact_method: input.preferredContactMethod,
  });
  if (error) return { error: error.message };

  revalidatePath("/portal/contacts");
  revalidatePath("/portal/proche");
  revalidatePath("/portal/contacts/preview");
  return { success: "Préférences du proche enregistrées." };
}
