import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { ClinicalMessenger } from "@/components/clinical-messenger";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const messagingRoles = ["doctor", "nurse", "manager", "governance"];

export default async function MessagesPage() {
  const profile = await requireProfile();
  if (!messagingRoles.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();
  const [{ data: contacts }, { data: messages }] = await Promise.all([
    supabase.rpc("clinical_message_contacts"),
    supabase.from("clinical_messages").select("id, sender_id, recipient_id, body, priority, read_at, created_at").or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order("created_at", { ascending: true }).limit(300),
  ]);
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Messagerie d’équipe</h1><p>Échanges privés et tracés entre médecins, infirmiers, cadres et gouvernance.</p></div></div>
    <ClinicalMessenger currentUserId={profile.id} contacts={contacts || []} initialMessages={messages || []} />
  </PortalShell>;
}
