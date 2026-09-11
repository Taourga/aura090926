import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { ClinicalMessenger } from "@/components/clinical-messenger";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const profile = await requireProfile();
  if (profile.role !== "doctor" && profile.role !== "nurse") redirect("/portal");
  const supabase = await createClient();
  const [{ data: contacts }, { data: messages }] = await Promise.all([
    supabase.rpc("clinical_message_contacts"),
    supabase.from("clinical_messages").select("id, sender_id, recipient_id, body, read_at, created_at").or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order("created_at", { ascending: true }).limit(250),
  ]);
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Messagerie clinique</h1><p>Échanges privés entre médecins et infirmiers.</p></div></div>
    <ClinicalMessenger currentUserId={profile.id} contacts={contacts || []} initialMessages={messages || []} />
  </PortalShell>;
}

