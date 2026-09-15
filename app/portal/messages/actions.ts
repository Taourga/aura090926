"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };
const staffMessagingRoles = ["doctor", "nurse", "manager", "governance"];
const messagingRoles = [...staffMessagingRoles, "patient"];

async function requireMessenger() {
  const profile = await requireProfile();
  if (!messagingRoles.includes(profile.role)) throw new Error("Accès non autorisé");
  return profile;
}

function createDemoAdminClient() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || process.env.VERCEL_ENV === "production" || (process.env.VERCEL && process.env.VERCEL_GIT_COMMIT_REF !== "aurademo")) return null;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function successForPriority(priority: number): ActionResult {
  return { success: priority === 3 ? "Message critique envoyé." : priority === 2 ? "Message important envoyé." : "Message envoyé." };
}

export async function sendClinicalMessage(recipientId: string, body: string, priority = 1): Promise<ActionResult> {
  const profile = await requireMessenger();
  const cleanBody = typeof body === "string" ? body.trim() : "";
  if (profile.facilityConfig["features.messaging"] === false) return { error: "Le module Messagerie est désactivé pour cet établissement." };
  if (profile.role === "patient") return { error: "La messagerie patient est en réception uniquement." };
  if (!recipientId || recipientId === profile.id) return { error: "Destinataire invalide." };
  if (!cleanBody || cleanBody.length > 2000) return { error: "Le message doit contenir entre 1 et 2 000 caractères." };
  if (![1, 2, 3].includes(priority)) return { error: "Niveau d’importance invalide." };

  const supabase = await createClient();
  const admin = createDemoAdminClient();

  if (!admin) {
    const { error } = await supabase.rpc("send_clinical_message", { p_recipient_id: recipientId, p_body: cleanBody, p_priority: priority });
    if (error) return { error: error.message };
    revalidatePath("/portal/messages");
    revalidatePath("/portal/pulse");
    return successForPriority(priority);
  }

  const { data: previewMembership } = await admin
    .from("facility_memberships")
    .select("role, active")
    .eq("facility_id", profile.facility.id)
    .eq("user_id", recipientId)
    .maybeSingle();

  if (previewMembership?.active && staffMessagingRoles.includes(previewMembership.role)) {
    const { error } = await supabase.rpc("send_clinical_message", { p_recipient_id: recipientId, p_body: cleanBody, p_priority: priority });
    if (error) return { error: error.message };
    revalidatePath("/portal/messages");
    revalidatePath("/portal/pulse");
    return successForPriority(priority);
  }

  if (!previewMembership?.active || previewMembership.role !== "patient" || !["nurse", "manager"].includes(profile.role)) {
    return { error: "Destinataire non autorisé." };
  }

  const { data: recipientProfile, error: profileError } = await admin.from("profiles").select("active").eq("id", recipientId).maybeSingle();
  if (profileError || !recipientProfile?.active) return { error: "Ce destinataire n’est plus disponible." };

  const { data: activeStay, error: stayError } = await admin
    .from("patient_stays")
    .select("id")
    .eq("facility_id", profile.facility.id)
    .eq("patient_id", recipientId)
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (stayError || !activeStay) return { error: "La messagerie patient est disponible uniquement pendant un séjour actif." };

  const { error: insertError } = await admin.from("clinical_messages").insert({
    facility_id: profile.facility.id,
    sender_id: profile.id,
    recipient_id: recipientId,
    body: cleanBody,
    priority,
  });
  if (insertError) return { error: "Le message n’a pas pu être envoyé." };

  revalidatePath("/portal/messages");
  revalidatePath("/portal/pulse");
  return successForPriority(priority);
}

export async function markClinicalMessagesRead(senderId: string): Promise<ActionResult> {
  const profile = await requireMessenger();
  if (!senderId || senderId === profile.id) return { error: "Expéditeur invalide." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_clinical_messages_read", { p_sender_id: senderId });
  if (error) return { error: error.message };

  revalidatePath("/portal/messages");
  revalidatePath("/portal/pulse");
  return { success: "Messages marqués comme lus." };
}
