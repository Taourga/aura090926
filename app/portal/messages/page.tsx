import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { ClinicalMessenger } from "@/components/clinical-messenger";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const staffMessagingRoles = ["doctor", "nurse", "manager", "governance"];
const messagingRoles = [...staffMessagingRoles, "patient"];

type Contact = { id: string; full_name: string; role: "doctor" | "nurse" | "manager" | "governance" | "patient" };
type ClinicalMessage = { id: string; sender_id: string; recipient_id: string; body: string; priority: number; read_at: string | null; created_at: string };

function normalizeStaffRole(value: string | null): Contact["role"] {
  if (value === "doctor" || value === "nurse" || value === "manager" || value === "governance") return value;
  return "nurse";
}

async function loadPatientInboxContacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  facilityId: string,
  patientId: string,
  messages: ClinicalMessage[],
): Promise<Contact[]> {
  const participantIds = [...new Set(messages.flatMap((message) => [message.sender_id, message.recipient_id]).filter((id) => id !== patientId))];
  if (!participantIds.length) return [];

  const { data: directoryRows } = await supabase
    .from("care_team_directory")
    .select("user_id,full_name,member_type")
    .eq("facility_id", facilityId)
    .eq("active", true)
    .in("user_id", participantIds);

  const byUserId = new Map((directoryRows || []).filter((row) => row.user_id).map((row) => [row.user_id as string, row]));
  return participantIds.map((id) => {
    const row = byUserId.get(id);
    return {
      id,
      full_name: row?.full_name || "Équipe soignante",
      role: normalizeStaffRole(row?.member_type || null),
    };
  });
}

async function loadActivePatientContacts(facilityId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<Contact[]> {
  const { data: stays } = await supabase.from("patient_stays").select("patient_id").eq("facility_id", facilityId).is("ended_at", null);
  const patientIds = [...new Set((stays || []).map((stay) => stay.patient_id))];
  if (!patientIds.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, active").in("id", patientIds).eq("active", true);
  return (profiles || []).map((item) => ({ id: item.id, full_name: item.full_name, role: "patient" as const })).sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"));
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const profile = await requireProfile();
  if (!messagingRoles.includes(profile.role)) redirect("/portal");
  const { contact: requestedContactId } = await searchParams;
  const supabase = await createClient();

  const { data: rawMessages } = await supabase
    .from("clinical_messages")
    .select("id, sender_id, recipient_id, body, priority, read_at, created_at")
    .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
    .order("created_at", { ascending: true })
    .limit(300);
  const messages = (rawMessages || []) as ClinicalMessage[];

  let contacts: Contact[] = [];
  if (profile.role === "patient") {
    contacts = await loadPatientInboxContacts(supabase, profile.facility.id, profile.id, messages);
  } else {
    const { data: staffContacts } = await supabase.rpc("clinical_message_contacts");
    contacts = ((staffContacts || []) as Contact[]).filter((contact) => staffMessagingRoles.includes(contact.role));
    if (["nurse", "manager"].includes(profile.role)) {
      const patients = await loadActivePatientContacts(profile.facility.id, supabase);
      const existing = new Set(contacts.map((contact) => contact.id));
      contacts = [...contacts, ...patients.filter((patient) => !existing.has(patient.id))];
    }
  }

  const initialSelectedId = requestedContactId && contacts.some((contact) => contact.id === requestedContactId) ? requestedContactId : null;
  const selectedContact = initialSelectedId ? contacts.find((contact) => contact.id === initialSelectedId) : null;
  const isPatient = profile.role === "patient";
  const unread = messages.filter((message) => message.recipient_id === profile.id && !message.read_at).length;
  const discussionIds = new Set(messages.map((message) => message.sender_id === profile.id ? message.recipient_id : message.sender_id));

  return <PortalShell profile={profile}>
    <div className="page-intro patient-message-intro">
      <div>
        <div className="section-kicker">{profile.role === "doctor" ? "Équipe de santé" : isPatient ? "Messages reçus" : "Messagerie"}</div>
        <h1>{isPatient ? "Mes messages" : selectedContact ? `Conversation · ${selectedContact.full_name}` : "Mes discussions"}</h1>
        <p>{isPatient ? "Retrouvez ici les messages transmis par votre équipe. Cet espace est en réception uniquement." : profile.role === "doctor" ? "Échanges réservés au personnel de santé. Les patients se gèrent depuis leur fiche et leur planning, sans messagerie directe ici." : "Échanges privés et tracés avec les contacts autorisés."}</p>
      </div>
      <a className="button button-secondary" href="/portal">⌂ Accueil</a>
    </div>
    {isPatient ? <section className="patient-inbox-summary" aria-label="Résumé des messages"><span>✉</span><strong>{unread}</strong><small>nouveau{unread > 1 ? "x" : ""} message{unread > 1 ? "s" : ""}</small></section> : <section className="message-overview"><div><span>✉</span><strong>{unread}</strong><small>Nouveaux messages</small></div><div><span>◌</span><strong>{discussionIds.size}</strong><small>Mes discussions</small></div></section>}
    <ClinicalMessenger currentUserId={profile.id} contacts={contacts} initialMessages={messages} isPatient={isPatient} initialSelectedId={initialSelectedId} />
  </PortalShell>;
}
