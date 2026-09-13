import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { TrustedContactConsent } from "@/components/trusted-contact-consent";
import { requireProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { PermissionStatus } from "@/lib/types";

type Rel<T> = T | T[] | null;
type Patient = { id: string; full_name: string; phone: string | null };
type Stay = { patient_id: string; room_number: string | null; presence: string; planned_discharge_at: string | null; ward: Rel<{ name: string; floor: string | null }> };
type Doctor = { id: string; full_name: string; specialty: string | null; user_id: string | null };
type Roster = { linked_profile_id: string | null; floor_number: number; reference_doctor_id: string };
type Contact = { patient_id: string; mobile_phone: string | null; personal_email: string | null; address_line1: string | null; postal_code: string | null; city: string | null };
type Trusted = { patient_id: string; full_name: string; relationship: string; phone: string | null; email: string | null; user_id: string | null; portal_enabled: boolean; scopes: Record<string, boolean>; notification_preferences: Record<string, boolean>; consented_at: string | null; revoked_at: string | null; access_expires_at: string | null; is_emergency_contact: boolean; preferred_contact_method: "email" | "sms" | "none" };
type Permission = { id: string; departure_at: string; return_at: string; reason: string | null; status: string };
type Appointment = { id: string; title: string; starts_at: string; ends_at: string; location: string | null };
type Enrollment = { id: string; activity: Rel<{ title: string; starts_at: string; location: string | null }> };

const one = <T,>(value: Rel<T>) => Array.isArray(value) ? value[0] : value;
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0,2).map((part)=>part[0]).join("").toUpperCase();

export const dynamic = "force-dynamic";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const profile = await requireProfile();
  if (profile.role !== "doctor") redirect("/portal");
  const { patient: requestedId } = await searchParams;
  const supabase = await createClient();

  const [{ data: doctors }, { data: rosterRows }, { data: patients }, { data: stays }, { data: contacts }, { data: trustedRows }] = await Promise.all([
    supabase.from("care_team_directory").select("id,full_name,specialty,user_id").eq("member_type","doctor").eq("active",true),
    supabase.from("clinic_patient_roster").select("linked_profile_id,floor_number,reference_doctor_id").eq("active",true),
    supabase.from("profiles").select("id,full_name,phone").eq("role","patient").eq("active",true).order("full_name"),
    supabase.from("patient_stays").select("patient_id,room_number,presence,planned_discharge_at,ward:wards(name,floor)").is("ended_at",null),
    supabase.from("patient_contact_cards").select("patient_id,mobile_phone,personal_email,address_line1,postal_code,city"),
    supabase.from("trusted_contacts").select("patient_id,full_name,relationship,phone,email,user_id,portal_enabled,scopes,notification_preferences,consented_at,revoked_at,access_expires_at,is_emergency_contact,preferred_contact_method"),
  ]);

  const doctorList = (doctors || []) as Doctor[];
  const currentDoctor = doctorList.find((d)=>d.user_id===profile.id);
  const myRoster = ((rosterRows || []) as Roster[]).filter((r)=>r.reference_doctor_id===currentDoctor?.id && r.linked_profile_id);
  const myIds = new Set(myRoster.map((r)=>r.linked_profile_id as string));
  const patientList = ((patients || []) as Patient[]).filter((p)=>myIds.has(p.id));
  const selected = patientList.find((p)=>p.id===requestedId) || patientList[0];
  const stayByPatient = new Map(((stays || []) as Stay[]).map((s)=>[s.patient_id,s]));
  const contactByPatient = new Map(((contacts || []) as Contact[]).map((c)=>[c.patient_id,c]));
  const trustedByPatient = new Map(((trustedRows || []) as Trusted[]).map((t)=>[t.patient_id,t]));
  const stay = selected ? stayByPatient.get(selected.id) : undefined;
  const contact = selected ? contactByPatient.get(selected.id) : undefined;
  const trusted = selected ? trustedByPatient.get(selected.id) : undefined;

  const [{ data: permissions }, { data: appointments }, { data: enrollments }] = selected ? await Promise.all([
    supabase.from("permission_requests").select("id,departure_at,return_at,reason,status").eq("patient_id",selected.id).order("departure_at",{ascending:false}).limit(8),
    supabase.from("appointments").select("id,title,starts_at,ends_at,location").eq("patient_id",selected.id).gte("ends_at",new Date().toISOString()).order("starts_at").limit(4),
    supabase.from("activity_enrollments").select("id,activity:activities(title,starts_at,location)").eq("patient_id",selected.id).limit(5),
  ]) : [{data:[]},{data:[]},{data:[]}];

  const permissionList = (permissions || []) as Permission[];
  const appointmentList = (appointments || []) as Appointment[];
  const enrollmentList = (enrollments || []) as Enrollment[];
  const activePermission = permissionList.find((p)=>["submitted","waiting","approved","departed"].includes(p.status));
  const activePortal = !!trusted?.portal_enabled && !!trusted.consented_at && !trusted.revoked_at && !!trusted.user_id && (!trusted.access_expires_at || new Date(trusted.access_expires_at) > new Date());
  const patientPhone = contact?.mobile_phone || selected?.phone || null;
  const patientEmail = contact?.personal_email || null;

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Médecin référent</div><h1>Mes patients</h1><p>Uniquement les patients dont vous assurez le suivi référent.</p></div></div>

    <div className="doctor-simple-layout">
      <aside className="doctor-simple-list">
        {patientList.map((patient)=>{ const s=stayByPatient.get(patient.id); return <Link key={patient.id} href={`/portal/patients?patient=${patient.id}`} className={`doctor-simple-patient${selected?.id===patient.id?" active":""}`}><span>{initials(patient.full_name)}</span><div><strong>{patient.full_name}</strong><small>Ch. {s?.room_number || "—"} · {s?.presence === "out" ? "Sorti" : "Présent"}</small></div></Link>; })}
        {!patientList.length && <p className="empty">Aucun patient référent.</p>}
      </aside>

      <section className="doctor-simple-record">
        {selected ? <>
          <div className="doctor-simple-header">
            <div><span className="section-kicker">Fiche patient</span><h2>{selected.full_name}</h2><p>Chambre {stay?.room_number || "—"} · {stay?.presence === "out" ? "Hors établissement" : "Présent"}</p></div>
            <div className="doctor-simple-actions"><Link className="button button-primary button-small" href="/portal/messages">✉ Message</Link><Link className="button button-secondary button-small" href="/portal/appointments">Planning</Link></div>
          </div>

          <div className="doctor-simple-kpis">
            <div><span>Prochain RDV</span><strong>{appointmentList[0] ? formatDateTime(appointmentList[0].starts_at) : "Aucun"}</strong></div>
            <div><span>Permission</span><strong>{activePermission ? activePermission.status === "approved" ? "Validée" : activePermission.status === "departed" ? "En cours" : "À traiter" : "Aucune"}</strong></div>
            <div><span>Sortie prévue</span><strong>{stay?.planned_discharge_at ? formatDateTime(stay.planned_discharge_at) : "Non prévue"}</strong></div>
          </div>

          <div className="doctor-simple-grid">
            <article className="doctor-simple-card">
              <div className="doctor-simple-card-head"><h3>Coordonnées</h3></div>
              {patientPhone ? <a className="contact-link" href={`tel:${patientPhone.replace(/\s+/g,"")}`}>{patientPhone}</a> : <strong>Téléphone non renseigné</strong>}
              {patientEmail ? <a className="contact-link" href={`mailto:${patientEmail}`}>{patientEmail}</a> : <span>Email non renseigné</span>}
              <span>{[contact?.address_line1,[contact?.postal_code,contact?.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Adresse non renseignée"}</span>
            </article>

            <article className="doctor-simple-card doctor-simple-card--trusted">
              <div className="doctor-simple-card-head"><h3>Personne de confiance</h3>{trusted && <span className={activePortal?"badge badge-success":"badge badge-neutral"}>{activePortal?"Portail actif":"Contact uniquement"}</span>}</div>
              {trusted ? <><strong>{trusted.full_name} · {trusted.relationship}</strong>{trusted.phone ? <a className="contact-link" href={`tel:${trusted.phone.replace(/\s+/g,"")}`}>{trusted.phone}</a> : <span>Téléphone non renseigné</span>}{trusted.email ? <a className="contact-link" href={`mailto:${trusted.email}`}>{trusted.email}</a> : <span>Email non renseigné</span>}{trusted.is_emergency_contact && <small>Contact d’urgence</small>}</> : <span>Non renseignée</span>}
            </article>

            <article className="doctor-simple-card">
              <div className="doctor-simple-card-head"><h3>Prochainement</h3><Link href="/portal/appointments">Voir tout →</Link></div>
              {appointmentList.length ? appointmentList.slice(0,3).map((a)=><div className="doctor-simple-row" key={a.id}><strong>{a.title}</strong><span>{formatDateTime(a.starts_at)} · {a.location || "Lieu à confirmer"}</span></div>) : <span>Aucun rendez-vous à venir.</span>}
            </article>

            <article className="doctor-simple-card">
              <div className="doctor-simple-card-head"><h3>Permissions</h3><Link href="/portal/permissions">Traiter →</Link></div>
              {permissionList.length ? permissionList.slice(0,3).map((p)=><div className="doctor-simple-row" key={p.id}><div><strong>{formatDateTime(p.departure_at)}</strong><span>Retour {formatDateTime(p.return_at)}</span></div><StatusBadge status={p.status as PermissionStatus} /></div>) : <span>Aucune permission.</span>}
            </article>
          </div>

          <details className="doctor-simple-more"><summary>Plus d’informations</summary>
            <div className="doctor-simple-more-grid">
              <div><h3>Activités inscrites</h3>{enrollmentList.map((e)=>{ const a=one(e.activity); return <p key={e.id}><strong>{a?.title || "Activité"}</strong><br/><span>{a ? formatDateTime(a.starts_at) : ""}</span></p>; })}{!enrollmentList.length && <p>Aucune activité.</p>}</div>
              {trusted && <div><h3>Partage avec le proche</h3><TrustedContactConsent patientId={selected.id} trustedName={trusted.full_name} initialEnabled={activePortal} initialScopes={trusted.scopes} initialNotifications={trusted.notification_preferences} initialExpiresAt={trusted.access_expires_at} initialEmergencyContact={trusted.is_emergency_contact} initialPreferredContactMethod={trusted.preferred_contact_method} canManage hasPortalAccount={!!trusted.user_id} /></div>}
            </div>
          </details>
        </> : <p className="empty">Aucun patient à afficher.</p>}
      </section>
    </div>
  </PortalShell>;
}
