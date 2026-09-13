import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { TrustedContactConsent } from "@/components/trusted-contact-consent";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Patient = { id: string; full_name: string };
type ContactCard = { patient_id: string; mobile_phone: string | null; personal_email: string | null; address_line1: string | null; postal_code: string | null; city: string | null; country_code: string | null };
type ScopeMap = { presence?: boolean; planning?: boolean; permissions?: boolean; activities?: boolean; visits?: boolean; menus?: boolean; information?: boolean; discharge?: boolean };
type Trusted = { patient_id: string; full_name: string; relationship: string; phone: string | null; email: string | null; portal_enabled: boolean; scopes: ScopeMap; consented_at: string | null; revoked_at: string | null };

const allowed = ["patient", "doctor", "manager", "nurse", "psychologist", "provider", "admin"];
const managers = ["patient", "doctor", "manager", "nurse", "admin"];

export default async function PatientContactsPage() {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();

  let patientsQuery = supabase.from("profiles").select("id,full_name").eq("role", "patient").eq("active", true).order("full_name");
  if (profile.role === "patient") patientsQuery = patientsQuery.eq("id", profile.id);

  const [{ data: patients }, { data: cards }, { data: trusted }] = await Promise.all([
    patientsQuery,
    supabase.from("patient_contact_cards").select("patient_id,mobile_phone,personal_email,address_line1,postal_code,city,country_code"),
    supabase.from("trusted_contacts").select("patient_id,full_name,relationship,phone,email,portal_enabled,scopes,consented_at,revoked_at"),
  ]);
  const patientList = (patients || []) as Patient[];
  const cardByPatient = new Map(((cards || []) as ContactCard[]).map((item) => [item.patient_id, item]));
  const trustedByPatient = new Map(((trusted || []) as Trusted[]).map((item) => [item.patient_id, item]));
  const canManageRole = managers.includes(profile.role);
  const dt = (value: string | null) => value ? formatDateTime(value, profile.facility.locale, profile.facility.timezone) : "Non renseigné";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Coordonnées & consentement</div><h1>{profile.role === "patient" ? "Mes contacts & mon proche" : "Contacts patients"}</h1><p>{profile.role === "patient" ? "Consultez votre personne de confiance et choisissez les informations de séjour qu’elle peut voir dans AURA." : "Coordonnées du patient, personne de confiance et gestion de l’accès numérique sous consentement."}</p></div></div>

    <div className="contact-card-grid">
      {patientList.map((patient) => {
        const card = cardByPatient.get(patient.id);
        const person = trustedByPatient.get(patient.id);
        const activePortal = !!person?.portal_enabled && !!person.consented_at && !person.revoked_at;
        const canManage = canManageRole && (profile.role !== "patient" || profile.id === patient.id);
        return <section className="work-card contact-card" key={patient.id}>
          <div className="work-card-head"><div><p className="section-kicker">Patient</p><h2>{patient.full_name}</h2></div>{person && <span className={activePortal ? "badge badge-success" : "badge badge-neutral"}>{activePortal ? "Proche connecté" : "Contact uniquement"}</span>}</div>
          <div className="work-card-body">
            <div className="contact-info-grid">
              <div><span className="row-meta">Téléphone patient</span><strong>{card?.mobile_phone || "Non renseigné"}</strong></div>
              <div><span className="row-meta">Email patient</span><strong>{card?.personal_email || "Non renseigné"}</strong></div>
              <div className="contact-info-wide"><span className="row-meta">Adresse</span><strong>{card ? [card.address_line1, [card.postal_code, card.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Non renseignée" : "Non renseignée"}</strong></div>
            </div>

            {person ? <>
              <div className="trusted-person-card">
                <div><span className="row-meta">Personne de confiance</span><strong>{person.full_name}</strong><small>{person.relationship}</small></div>
                <div><span className="row-meta">Coordonnées</span><strong>{person.phone || "Téléphone non renseigné"}</strong><small>{person.email || "Email non renseigné"}</small></div>
                <div><span className="row-meta">Consentement</span><strong>{activePortal ? `Actif depuis ${dt(person.consented_at)}` : person.revoked_at ? `Révoqué le ${dt(person.revoked_at)}` : "Portail non activé"}</strong><small>L’accès peut être retiré à tout moment.</small></div>
              </div>
              <TrustedContactConsent patientId={patient.id} trustedName={person.full_name} initialEnabled={activePortal} initialScopes={person.scopes} canManage={canManage} />
            </> : <p className="empty">Aucune personne de confiance renseignée pour ce patient.</p>}
          </div>
        </section>;
      })}
      {!patientList.length && <section className="card"><div className="card-body"><p className="empty">Aucun patient à afficher.</p></div></section>}
    </div>
  </PortalShell>;
}
