import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { ClinicalMessenger } from "@/components/clinical-messenger";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const staffMessagingRoles = ["doctor", "nurse", "manager", "governance"];
const patientContactRoles = ["doctor", "nurse", "manager"];
const messagingRoles = [...staffMessagingRoles, "patient"];

type Contact = { id: string; full_name: string; role: "doctor" | "nurse" | "manager" | "governance" | "patient" };

function createDemoAdminClient() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || process.env.VERCEL_ENV === "production" || (process.env.VERCEL && process.env.VERCEL_GIT_COMMIT_REF !== "aurademo")) return null;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function loadPatientContacts(facilityId: string): Promise<Contact[]> {
  const admin = createDemoAdminClient();
  if (!admin) return [];

  const { data: memberships } = await admin
    .from("facility_memberships")
    .select("user_id, role")
    .eq("facility_id", facilityId)
    .eq("active", true)
    .in("role", patientContactRoles);
  const rows = memberships || [];
  const ids = rows.map((row) => row.user_id);
  if (!ids.length) return [];

  const { data: profiles } = await admin.from("profiles").select("id, full_name, active").in("id", ids).eq("active", true);
  const names = new Map((profiles || []).map((item) => [item.id, item.full_name]));
  return rows
    .filter((row) => names.has(row.user_id))
    .map((row) => ({ id: row.user_id, full_name: names.get(row.user_id)!, role: row.role as Contact["role"] }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"));
}

async function loadActivePatientContacts(facilityId: string): Promise<Contact[]> {
  const admin = createDemoAdminClient();
  if (!admin) return [];

  const { data: stays } = await admin
    .from("patient_stays")
    .select("patient_id")
    .eq("facility_id", facilityId)
    .is("ended_at", null);
  const patientIds = [...new Set((stays || []).map((stay) => stay.patient_id))];
  if (!patientIds.length) return [];

  const { data: memberships } = await admin
    .from("facility_memberships")
    .select("user_id")
    .eq("facility_id", facilityId)
    .eq("role", "patient")
    .eq("active", true)
    .in("user_id", patientIds);
  const allowedIds = (memberships || []).map((row) => row.user_id);
  if (!allowedIds.length) return [];

  const { data: profiles } = await admin.from("profiles").select("id, full_name, active").in("id", allowedIds).eq("active", true);
  return (profiles || [])
    .map((item) => ({ id: item.id, full_name: item.full_name, role: "patient" as const }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"));
}

export default async function MessagesPage() {
  const profile = await requireProfile();
  if (!messagingRoles.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("clinical_messages")
    .select("id, sender_id, recipient_id, body, priority, read_at, created_at")
    .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
    .order("created_at", { ascending: true })
    .limit(300);

  let contacts: Contact[] = [];
  if (profile.role === "patient") {
    contacts = await loadPatientContacts(profile.facility.id);
  } else {
    const { data: staffContacts } = await supabase.rpc("clinical_message_contacts");
    contacts = ((staffContacts || []) as Contact[]).filter((contact) => staffMessagingRoles.includes(contact.role));
    if (["doctor", "nurse", "manager"].includes(profile.role)) {
      const patients = await loadActivePatientContacts(profile.facility.id);
      const existing = new Set(contacts.map((contact) => contact.id));
      contacts = [...contacts, ...patients.filter((patient) => !existing.has(patient.id))];
    }
  }

  const isPatient = profile.role === "patient";
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>{isPatient ? "Messagerie patient" : "Messagerie d’équipe"}</h1><p>{isPatient ? "Échangez directement avec votre équipe soignante pendant votre séjour." : "Échanges privés et tracés entre l’équipe soignante et les patients autorisés."}</p></div></div>
    <ClinicalMessenger currentUserId={profile.id} contacts={contacts} initialMessages={messages || []} isPatient={isPatient} />
  </PortalShell>;
}
