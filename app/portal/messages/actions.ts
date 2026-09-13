"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };
const messagingRoles = ["doctor", "nurse", "manager", "governance"];

async function requireClinicalMessenger() {
  const profile = await requireProfile();
  if (!messagingRoles.includes(profile.role)) throw new Error("Accès non autorisé");
  return profile;
}

export async function sendClinicalMessage(recipientId: string, body: string, priority = 1): Promise<ActionResult> {
  await requireClinicalMessenger();
  if (![1, 2, 3].includes(priority)) return { error: "Niveau d’importance invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_clinical_message", { p_recipient_id: recipientId, p_body: body, p_priority: priority });
  if (error) return { error: error.message };
  revalidatePath("/portal/messages");
  revalidatePath("/portal/pulse");
  return { success: priority === 3 ? "Message critique envoyé." : priority === 2 ? "Message important envoyé." : "Message envoyé." };
}

export async function markClinicalMessagesRead(senderId: string): Promise<ActionResult> {
  await requireClinicalMessenger();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_clinical_messages_read", { p_sender_id: senderId });
  if (error) return { error: error.message };
  revalidatePath("/portal/messages");
  revalidatePath("/portal/pulse");
  return { success: "Messages marqués comme lus." };
}
