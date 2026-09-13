import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Patient = { id: string; full_name: string };
type ContactCard = { patient_id: string; mobile_phone: string | null; personal_email: string | null; address_line1: string | null; postal_code: string | null; city: string | null; country_code: string | null };
type Trusted = { patient_id: string; full_name: string; relationship: string; phone: string | null; email: string | null; portal_enabled: boolean; consented_at: string | null; revoked_at: string | null };

const allowed = ["doctor", "manager", "nurse", "psychologist", "provider"];

export default async function PatientContactsPage() {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();
  const [{ data: patients }, { data: cards }, { data: trusted }] = await Promise.all([
    supabase.from("profiles").select("id,full_name").eq("role", "patient").eq("active", true).order("full_name"),
    supabase.from("patient_contact_cards").select("patient_id,mobile_phone,personal_email,address_line1,postal_code,city,country_code"),
    supabase.from("trusted_contacts").select("patient_id,full_name,relationship,phone,email,portal_enabled,consented_at,revoked_at").is("revoked_at", null),
  ]);
  const cardByPatient = new Map(((cards || []) as ContactCard[]).map((item) => [item.patient_id, item]));
  const trustedByPatient = new Map(((trusted || []) as Trusted[]).map((item) => [item.patient_id, item]));

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Coordonnées utiles</div><h1>Contacts patients</h1><p>Coordonnées du patient et personne de confiance désignée. Ces informations sont réservées aux professionnels autorisés.</p></div></div>
    <section className="card"><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Coordonnées</th><th>Adresse</th><th>Personne de confiance</th><th>Accès portail</th></tr></thead><tbody>{(patients || []).map((patient: Patient) => {
      const card = cardByPatient.get(patient.id);
      const person = trustedByPatient.get(patient.id);
      return <tr key={patient.id}><td><strong>{patient.full_name}</strong></td><td>{card ? <><strong>{card.mobile_phone || "—"}</strong><br /><span className="row-meta">{card.personal_email || "Email non renseigné"}</span></> : "Non renseignées"}</td><td>{card ? <span>{card.address_line1 || "—"}<br />{[card.postal_code, card.city].filter(Boolean).join(" ")}</span> : "—"}</td><td>{person ? <><strong>{person.full_name}</strong><br /><span className="row-meta">{person.relationship} · {person.phone || "Téléphone non renseigné"}<br />{person.email || ""}</span></> : "Non renseignée"}</td><td>{person?.portal_enabled && person.consented_at ? <span className="badge badge-success">Autorisé</span> : <span className="badge badge-neutral">Contact uniquement</span>}</td></tr>;
    })}{!(patients || []).length && <tr><td colSpan={5} className="empty">Aucun patient actif.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
