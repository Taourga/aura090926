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
type NotificationMap = { presence?: boolean; planning?: boolean; permissions?: boolean; visits?: boolean; discharge?: boolean };
type Trusted = {
  patient_id: string;
  full_name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  user_id: string | null;
  portal_enabled: boolean;
  scopes: ScopeMap;
  notification_preferences: NotificationMap;
  consented_at: string | null;
  revoked_at: string | null;
  access_expires_at: string | null;
  is_emergency_contact: boolean;
  preferred_contact_method: "email" | "sms" | "none";
};

const allowed = ["patient", "doctor", "manager", "nurse", "psychologist", "provider", "admin"];
const managers = ["patient", "doctor", "manager", "nurse", "admin"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default async function PatientContactsPage() {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();

  let patientsQuery = supabase.from("profiles").select("id,full_name").eq("role", "patient").eq("active", true).order("full_name");
  if (profile.role === "patient") patientsQuery = patientsQuery.eq("id", profile.id);

  const [{ data: patients }, { data: cards }, { data: trusted }] = await Promise.all([
    patientsQuery,
    supabase.from("patient_contact_cards").select("patient_id,mobile_phone,personal_email,address_line1,postal_code,city,country_code"),
    supabase.from("trusted_contacts").select("patient_id,full_name,relationship,phone,email,user_id,portal_enabled,scopes,notification_preferences,consented_at,revoked_at,access_expires_at,is_emergency_contact,preferred_contact_method"),
  ]);
  const patientList = (patients || []) as Patient[];
  const cardByPatient = new Map(((cards || []) as ContactCard[]).map((item) => [item.patient_id, item]));
  const trustedByPatient = new Map(((trusted || []) as Trusted[]).map((item) => [item.patient_id, item]));
  const canManageRole = managers.includes(profile.role);
  const dt = (value: string | null) => value ? formatDateTime(value, profile.facility.locale, profile.facility.timezone) : "Non renseigné";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Coordonnées & consentement</div><h1>{profile.role === "patient" ? "Mes contacts & mon proche" : "Contacts patients"}</h1><p>{profile.role === "patient" ? "Vos coordonnées, votre personne de confiance et le contrôle précis des informations que vous choisissez de partager." : "Une lecture claire : d’abord le patient, puis sa personne de confiance, puis les droits de partage."}</p></div></div>

    <div className="contact-card-grid">
      {patientList.map((patient) => {
        const card = cardByPatient.get(patient.id);
        const person = trustedByPatient.get(patient.id);
        const expired = !!person?.access_expires_at && new Date(person.access_expires_at).getTime() <= Date.now();
        const activePortal = !!person?.portal_enabled && !!person.consented_at && !person.revoked_at && !!person.user_id && !expired;
        const canManage = canManageRole && (profile.role !== "patient" || profile.id === patient.id);
        return <section className="contact-workspace" key={patient.id}>
          <div className="contact-pair-grid">
            <section className="identity-panel identity-panel-patient">
              <div className="identity-panel-head">
                <span className="identity-avatar patient-avatar-large">{initials(patient.full_name)}</span>
                <div><span className="identity-eyebrow">PATIENT</span><h2>{patient.full_name}</h2><p>Coordonnées personnelles du patient</p></div>
              </div>
              <div className="identity-details">
                <div><span>Téléphone du patient</span><strong>{card?.mobile_phone || "Non renseigné"}</strong></div>
                <div><span>Email du patient</span><strong>{card?.personal_email || "Non renseigné"}</strong></div>
                <div className="identity-detail-wide"><span>Adresse du patient</span><strong>{card ? [card.address_line1, [card.postal_code, card.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Non renseignée" : "Non renseignée"}</strong></div>
              </div>
            </section>

            <section className="identity-panel identity-panel-trusted">
              {person ? <>
                <div className="identity-panel-head">
                  <span className="identity-avatar trusted-avatar-large">{initials(person.full_name)}</span>
                  <div><span className="identity-eyebrow">PERSONNE DE CONFIANCE</span><h2>{person.full_name}</h2><p>{person.relationship} de {patient.full_name}</p></div>
                </div>
                <div className="identity-details">
                  <div><span>Téléphone de la personne de confiance</span><strong>{person.phone || "Non renseigné"}</strong></div>
                  <div><span>Email de la personne de confiance</span><strong>{person.email || "Non renseigné"}</strong></div>
                  <div><span>Rôle</span><strong>{person.relationship}</strong></div>
                  <div><span>Contact d’urgence</span><strong>{person.is_emergency_contact ? "Oui" : "Non"}</strong></div>
                </div>
                <div className="trusted-status-row">
                  <span className={activePortal ? "badge badge-success" : expired ? "badge badge-warning" : "badge badge-neutral"}>{activePortal ? "Portail actif" : expired ? "Accès expiré" : person.user_id ? "Portail désactivé" : "Contact uniquement"}</span>
                  {activePortal && <span className="row-meta">Consentement : {dt(person.consented_at)}</span>}
                  {person.access_expires_at && <span className="row-meta">Fin d’accès : {dt(person.access_expires_at)}</span>}
                </div>
              </> : <div className="identity-empty"><span>♡</span><strong>Aucune personne de confiance</strong><p>Aucun contact de confiance n’est encore renseigné pour ce patient.</p></div>}
            </section>
          </div>

          {person && <section className="sharing-panel">
            <div className="sharing-panel-title"><div><span className="identity-eyebrow">PARTAGE & CONSENTEMENT</span><h2>Ce que {person.full_name} peut voir</h2><p>Les coordonnées ci-dessus restent distinctes des informations de séjour partagées dans le portail.</p></div></div>
            <TrustedContactConsent
              patientId={patient.id}
              trustedName={person.full_name}
              initialEnabled={activePortal}
              initialScopes={person.scopes}
              initialNotifications={person.notification_preferences}
              initialExpiresAt={person.access_expires_at}
              initialEmergencyContact={person.is_emergency_contact}
              initialPreferredContactMethod={person.preferred_contact_method}
              canManage={canManage}
              hasPortalAccount={!!person.user_id}
            />
            {!canManage && <div className="overview-note"><strong>Consultation uniquement</strong><span>Vous pouvez voir la personne de confiance et le statut du portail, mais seuls le patient, le médecin, l’infirmier, le cadre ou l’administrateur peuvent modifier le partage.</span></div>}
          </section>}
        </section>;
      })}
      {!patientList.length && <section className="card"><div className="card-body"><p className="empty">Aucun patient à afficher.</p></div></section>}
    </div>
  </PortalShell>;
}
