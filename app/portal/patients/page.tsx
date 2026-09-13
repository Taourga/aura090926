import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { TrustedContactConsent } from "@/components/trusted-contact-consent";
import { requireProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { PermissionStatus } from "@/lib/types";

type Relation<T> = T | T[] | null;
type Patient = { id: string; full_name: string; phone: string | null };
type Stay = { patient_id: string; room_number: string | null; presence: string; ward: Relation<{ name: string; floor: string | null }> };
type Permission = { id: string; departure_at: string; return_at: string; reason: string | null; status: string; created_at: string; doctor_decision: string | null; doctor_decided_at: string | null; manager_decision: string | null; manager_decided_at: string | null; departed_at: string | null; returned_at: string | null };
type Enrollment = { created_at: string; activity: Relation<{ title: string; starts_at: string; location: string | null }> };
type Appointment = { id: string; title: string; starts_at: string; ends_at: string; location: string | null; created_at: string };
type Doctor = { id: string; full_name: string; specialty: string | null; user_id: string | null };
type Roster = { linked_profile_id: string | null; floor_number: number; reference_doctor_id: string };
type ContactCard = { patient_id: string; mobile_phone: string | null; personal_email: string | null; address_line1: string | null; postal_code: string | null; city: string | null };
type Trusted = { patient_id: string; full_name: string; relationship: string; phone: string | null; email: string | null; user_id: string | null; portal_enabled: boolean; scopes: Record<string, boolean>; notification_preferences: Record<string, boolean>; consented_at: string | null; revoked_at: string | null; access_expires_at: string | null; is_emergency_contact: boolean; preferred_contact_method: "email" | "sms" | "none" };

function one<T>(value: Relation<T>) { return Array.isArray(value) ? value[0] : value; }
function floorLabel(roomNumber: string | null) { const floor = roomNumber?.trim().charAt(0); if (floor === "0") return "RDC"; if (floor === "1") return "1er étage"; if (floor === "2" || floor === "3") return `${floor}e étage`; return "Étage non renseigné"; }
function initials(name: string) { return name.split(" ").filter(Boolean).slice(0,2).map((part) => part[0]).join("").toUpperCase(); }

function History({ permissions, enrollments, appointments }: { permissions: Permission[]; enrollments: Enrollment[]; appointments: Appointment[] }) {
  const entries = [
    ...permissions.flatMap((permission) => [{ date: permission.created_at, title: "Permission demandée", detail: permission.reason || "Sans motif", tone: "permission" }, ...(permission.doctor_decided_at ? [{ date: permission.doctor_decided_at, title: `Décision médecin · ${permission.doctor_decision === "approved" ? "accord" : "refus"}`, detail: "Permission", tone: "validation" }] : []), ...(permission.manager_decided_at ? [{ date: permission.manager_decided_at, title: `Décision cadre · ${permission.manager_decision === "approved" ? "accord" : "refus"}`, detail: "Permission", tone: "validation" }] : []), ...(permission.departed_at ? [{ date: permission.departed_at, title: "Départ enregistré", detail: "Accueil", tone: "movement" }] : []), ...(permission.returned_at ? [{ date: permission.returned_at, title: "Retour enregistré", detail: "Présence à jour", tone: "movement" }] : [])]),
    ...enrollments.map((enrollment) => { const activity = one(enrollment.activity); return { date: enrollment.created_at, title: `Inscription · ${activity?.title || "Activité"}`, detail: activity ? `${formatDateTime(activity.starts_at)} · ${activity.location || "Lieu à confirmer"}` : "", tone: "activity" }; }),
    ...appointments.map((appointment) => ({ date: appointment.created_at, title: `Rendez-vous · ${appointment.title}`, detail: `${formatDateTime(appointment.starts_at)} · ${appointment.location || "Lieu à confirmer"}`, tone: "appointment" })),
  ].sort((a,b) => new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,12);
  return <div className="patient-history">{entries.length ? entries.map((entry,index)=><div className="history-row" key={`${entry.date}-${index}`}><span className={`history-marker history-marker--${entry.tone}`} /><div><strong>{entry.title}</strong><p>{entry.detail}</p></div><time>{formatDateTime(entry.date)}</time></div>) : <p className="empty">Aucun événement enregistré.</p>}</div>;
}

export const dynamic = "force-dynamic";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const profile = await requireProfile(); if (profile.role !== "doctor") redirect("/portal");
  const { patient: requestedPatientId } = await searchParams;
  const supabase = await createClient();
  const [{ data: allPatients }, { data: stays }, { data: rosterRows }, { data: doctorRows }, { data: cards }, { data: trustedRows }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone").eq("role","patient").eq("active",true).order("full_name"),
    supabase.from("patient_stays").select("patient_id,room_number,presence,ward:wards(name,floor)").is("ended_at",null),
    supabase.from("clinic_patient_roster").select("linked_profile_id,floor_number,reference_doctor_id").eq("active",true),
    supabase.from("care_team_directory").select("id,full_name,specialty,user_id").eq("member_type","doctor").eq("active",true).order("full_name"),
    supabase.from("patient_contact_cards").select("patient_id,mobile_phone,personal_email,address_line1,postal_code,city"),
    supabase.from("trusted_contacts").select("patient_id,full_name,relationship,phone,email,user_id,portal_enabled,scopes,notification_preferences,consented_at,revoked_at,access_expires_at,is_emergency_contact,preferred_contact_method"),
  ]);
  const roster = (rosterRows || []) as Roster[]; const doctors = (doctorRows || []) as Doctor[]; const currentDoctor = doctors.find((doctor)=>doctor.user_id===profile.id);
  const myRoster = currentDoctor ? roster.filter((item)=>item.reference_doctor_id===currentDoctor.id && item.linked_profile_id) : [];
  const myIds = new Set(myRoster.map((item)=>item.linked_profile_id as string));
  const patientList = ((allPatients || []) as Patient[]).filter((patient)=>myIds.has(patient.id));
  const stayByPatient = new Map(((stays || []) as Stay[]).map((stay)=>[stay.patient_id,stay]));
  const cardByPatient = new Map(((cards || []) as ContactCard[]).map((item)=>[item.patient_id,item]));
  const trustedByPatient = new Map(((trustedRows || []) as Trusted[]).map((item)=>[item.patient_id,item]));
  const selectedPatient = patientList.find((p)=>p.id===requestedPatientId) || patientList[0];
  const selectedStay = selectedPatient ? stayByPatient.get(selectedPatient.id) : undefined;
  const selectedCard = selectedPatient ? cardByPatient.get(selectedPatient.id) : undefined;
  const trusted = selectedPatient ? trustedByPatient.get(selectedPatient.id) : undefined;

  const [{ data: permissions }, { data: enrollments }, { data: appointments }] = selectedPatient ? await Promise.all([
    supabase.from("permission_requests").select("id,departure_at,return_at,reason,status,created_at,doctor_decision,doctor_decided_at,manager_decision,manager_decided_at,departed_at,returned_at").eq("patient_id",selectedPatient.id).order("created_at",{ascending:false}),
    supabase.from("activity_enrollments").select("created_at,activity:activities(title,starts_at,location)").eq("patient_id",selectedPatient.id).order("created_at",{ascending:false}),
    supabase.from("appointments").select("id,title,starts_at,ends_at,location,created_at").eq("patient_id",selectedPatient.id).order("starts_at",{ascending:false}),
  ]) : [{data:[]},{data:[]},{data:[]}];
  const patientPermissions=(permissions||[]) as Permission[]; const patientEnrollments=(enrollments||[]) as Enrollment[]; const patientAppointments=(appointments||[]) as Appointment[];
  const futureAppointments=patientAppointments.filter((a)=>new Date(a.ends_at)>new Date()).sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()).slice(0,3);
  const activePortal = !!trusted?.portal_enabled && !!trusted.consented_at && !trusted.revoked_at && !!trusted.user_id && (!trusted.access_expires_at || new Date(trusted.access_expires_at)>new Date());

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Suivi référent</div><h1>Mes patients</h1><p>Uniquement les patients dont vous êtes le médecin référent.</p></div><Link className="button button-secondary" href="/portal/appointments">Mon planning</Link></div>
    <section className="metric-grid compact-metrics"><div className="metric"><span>Mes patients</span><strong>{patientList.length}</strong><div className="metric-detail">Profils interactifs de démo</div></div><div className="metric"><span>Étages couverts</span><strong>{new Set(myRoster.map((r)=>r.floor_number)).size}</strong><div className="metric-detail">Répartition du portefeuille</div></div><div className="metric"><span>Permissions actives</span><strong>{patientPermissions.filter((p)=>["submitted","waiting","approved","departed"].includes(p.status)).length}</strong><div className="metric-detail">Patient sélectionné</div></div></section>
    <div className="doctor-patient-workspace">
      <aside className="patient-directory card"><div className="card-header"><div><h2>Mes patients</h2><p className="card-subtitle">Cliquez pour ouvrir la fiche.</p></div></div><div className="patient-directory-list">{patientList.map((patient)=>{ const stay=stayByPatient.get(patient.id); const selected=selectedPatient?.id===patient.id; return <Link key={patient.id} href={`/portal/patients?patient=${patient.id}`} className={`patient-select ${selected?"patient-select--active":""}`}><span className="patient-avatar">{initials(patient.full_name)}</span><span><strong>{patient.full_name}</strong><small>{stay ? `${floorLabel(stay.room_number)} · chambre ${stay.room_number || "—"}` : "Pas de séjour actif"}</small></span>{stay && <i className={`presence-dot presence-dot--${stay.presence}`} />}</Link>;})}{!patientList.length && <p className="empty">Aucun patient référent interactif.</p>}</div></aside>
      <section className="patient-record">{selectedPatient ? <>
        <section className="record-header"><div><p className="section-kicker">Fiche patient</p><h2>{selectedPatient.full_name}</h2><p>{selectedStay ? `${floorLabel(selectedStay.room_number)} · chambre ${selectedStay.room_number || "—"}` : "Aucun séjour actif"}</p></div><div className="patient-record-actions"><span className={`presence-pill ${selectedStay?.presence === "present"?"presence-pill--present":"presence-pill--out"}`}>{selectedStay?.presence === "out"?"Sorti":"Présent"}</span><Link className="button button-secondary button-small" href="/portal/messages">Message</Link></div></section>
        <section className="patient-contact-inline"><div className="patient-contact-block"><span className="section-kicker">Coordonnées patient</span><strong>{selectedCard?.mobile_phone || selectedPatient.phone || "Téléphone non renseigné"}</strong><small>{selectedCard?.personal_email || "Email non renseigné"}</small><small>{selectedCard ? [selectedCard.address_line1,[selectedCard.postal_code,selectedCard.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ") : "Adresse non renseignée"}</small></div><div className="patient-contact-block patient-contact-block--trusted"><span className="section-kicker">Personne de confiance</span>{trusted ? <><strong>{trusted.full_name} · {trusted.relationship}</strong><small>{trusted.phone || "Téléphone non renseigné"} · {trusted.email || "Email non renseigné"}</small><span className={activePortal?"badge badge-success":"badge badge-neutral"}>{activePortal?"Portail proche actif":"Contact uniquement / portail inactif"}</span></> : <strong>Non renseignée</strong>}</div></section>
        {trusted && <details className="trusted-inline-details"><summary>Gérer le partage avec {trusted.full_name}</summary><TrustedContactConsent patientId={selectedPatient.id} trustedName={trusted.full_name} initialEnabled={activePortal} initialScopes={trusted.scopes} initialNotifications={trusted.notification_preferences} initialExpiresAt={trusted.access_expires_at} initialEmergencyContact={trusted.is_emergency_contact} initialPreferredContactMethod={trusted.preferred_contact_method} canManage hasPortalAccount={!!trusted.user_id} /></details>}
        <div className="patient-record-grid">
          <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Permissions</p><h2>À connaître</h2></div><Link href="/portal/permissions" className="text-link">Traiter →</Link></div><div className="work-card-body">{patientPermissions.slice(0,4).map((permission)=><div className="record-row" key={permission.id}><div><strong>{formatDateTime(permission.departure_at)}</strong><small>Retour {formatDateTime(permission.return_at)}</small></div><StatusBadge status={permission.status as PermissionStatus}/></div>)}{!patientPermissions.length&&<p className="empty">Aucune permission.</p>}</div></section>
          <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Prochainement</p><h2>Planning</h2></div><Link href="/portal/appointments" className="text-link">Planning →</Link></div><div className="work-card-body">{futureAppointments.map((appointment)=><div className="record-row" key={appointment.id}><div><strong>{appointment.title}</strong><small>{formatDateTime(appointment.starts_at)} · {appointment.location || "Lieu à confirmer"}</small></div></div>)}{!futureAppointments.length&&<p className="empty">Aucun rendez-vous à venir.</p>}</div></section>
          <section className="work-card patient-record-grid--wide"><div className="work-card-head"><div><p className="section-kicker">Activités</p><h2>Inscriptions</h2></div></div><div className="work-card-body">{patientEnrollments.slice(0,5).map((enrollment,index)=>{const activity=one(enrollment.activity);return <div className="record-row" key={`${enrollment.created_at}-${index}`}><div><strong>{activity?.title||"Activité"}</strong><small>{activity?`${formatDateTime(activity.starts_at)} · ${activity.location||"Lieu à confirmer"}`:""}</small></div><span className="badge badge-info">Inscrit</span></div>;})}{!patientEnrollments.length&&<p className="empty">Aucune activité.</p>}</div></section>
          <section className="work-card patient-record-grid--wide"><div className="work-card-head"><div><p className="section-kicker">Historique</p><h2>Derniers événements</h2></div></div><div className="work-card-body"><History permissions={patientPermissions} enrollments={patientEnrollments} appointments={patientAppointments}/></div></section>
        </div>
      </> : <section className="work-card"><div className="queue-empty">Aucun patient à afficher.</div></section>}</section>
    </div>
  </PortalShell>;
}
