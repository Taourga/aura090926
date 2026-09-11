"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };

async function requireClinicalMessenger() {
  const profile = await requireProfile();
  if (profile.role !== "doctor" && profile.role !== "nurse") throw new Error("Accès non autorisé");
  return profile;
}

export async function sendClinicalMessage(recipientId: string, body: string): Promise<ActionResult> {
  await requireClinicalMessenger();
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_clinical_message", { p_recipient_id: recipientId, p_body: body });
  if (error) return { error: error.message };
  revalidatePath("/portal/messages");
  return { success: "Message envoyé." };
}

export async function markClinicalMessagesRead(senderId: string): Promise<ActionResult> {
  await requireClinicalMessenger();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_clinical_messages_read", { p_sender_id: senderId });
  if (error) return { error: error.message };
  revalidatePath("/portal/messages");
  return { success: "Messages lus." };
}

