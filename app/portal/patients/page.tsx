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
type Roster = { id: string; display_name: string; linked_profile_id: string | null; floor_number: number; room_number: string | null; reference_doctor_id: string };
type Contact = { patient_id: string; mobile_phone: string | null; personal_email: string | null; address_line1: string | null; postal_code: string | null; city: string | null };
type Trusted = { patient_id: string; full_name: string; relationship: string; phone: string | null; email: string | null; user_id: string | null; portal_enabled: boolean; scopes: Record<string, boolean>; notification_preferences: Record<string, boolean>; consented_at: string | null; revoked_at: string | null; access_expires_at: string | null; is_emergency_contact: boolean; preferred_contact_method: "email" | "sms" | "none" };
type Permission = { id: string; patient_id?: string; departure_at: string; return_at: string; reason: string | null; status: string };
type Appointment = { id: string; title: string; starts_at: string; ends_at?: string; location: string | null };
type Enrollment = { id: string; activity: Rel<{ title: string; starts_at: string; location: string | null; requires_prescription: boolean }> };
type DemoScenario = {
  id: string;
  roster_id: string;
  presence: "present" | "out";
  planned_discharge_at: string | null;
  permission_status: string | null;
  permission_departure_at: string | null;
  permission_return_at: string | null;
  next_appointment_at: string | null;
  next_appointment_title: string | null;
  next_appointment_location: string | null;
  prescribed_activity_title: string | null;
  prescribed_activity_at: string | null;
  prescribed_activity_location: string | null;
  mobile_phone: string | null;
  personal_email: string | null;
  city: string | null;
  trusted_contact_name: string | null;
  trusted_contact_relationship: string | null;
  trusted_contact_phone: string | null;
  trusted_contact_email: string | null;
};
type UnifiedPatient = {
  key: string;
  profileId: string | null;
  rosterId: string;
  full_name: string;
  phone: string | null;
  room_number: string | null;
  presence: "present" | "out";
  planned_discharge_at: string | null;
  permission_status: string | null;
  isDemo: boolean;
  scenario: DemoScenario | null;
};

const one = <T,>(value: Rel<T>) => Array.isArray(value) ? value[0] : value;
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0,2).map((part)=>part[0]).join("").toUpperCase();

export const dynamic = "force-dynamic";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ patient?: string; filter?: string }> }) {
  const profile = await requireProfile();
  if (profile.role !== "doctor") redirect("/portal");
  const { patient: requestedId, filter = "all" } = await searchParams;
  const supabase = await createClient();

  const [
    { data: doctors },
    { data: rosterRows },
    { data: patients },
    { data: stays },
    { data: contacts },
    { data: trustedRows },
    { data: activePermissionRows },
    { data: demoScenarioRows },
  ] = await Promise.all([
    supabase.from("care_team_directory").select("id,full_name,specialty,user_id").eq("member_type","doctor").eq("active",true),
    supabase.from("clinic_patient_roster").select("id,display_name,linked_profile_id,floor_number,room_number,reference_doctor_id").eq("active",true),
    supabase.from("profiles").select("id,full_name,phone").eq("role","patient").eq("active",true).order("full_name"),
    supabase.from("patient_stays").select("patient_id,room_number,presence,planned_discharge_at,ward:wards(name,floor)").is("ended_at",null),
    supabase.from("patient_contact_cards").select("patient_id,mobile_phone,personal_email,address_line1,postal_code,city"),
    supabase.from("trusted_contacts").select("patient_id,full_name,relationship,phone,email,user_id,portal_enabled,scopes,notification_preferences,consented_at,revoked_at,access_expires_at,is_emergency_contact,preferred_contact_method"),
    supabase.from("permission_requests").select("id,patient_id,departure_at,return_at,reason,status").in("status",["submitted","waiting","approved","departed"]),
    supabase.from("demo_patient_scenarios").select("id,roster_id,presence,planned_discharge_at,permission_status,permission_departure_at,permission_return_at,next_appointment_at,next_appointment_title,next_appointment_location,prescribed_activity_title,prescribed_activity_at,prescribed_activity_location,mobile_phone,personal_email,city,trusted_contact_name,trusted_contact_relationship,trusted_contact_phone,trusted_contact_email"),
  ]);

  const doctorList = (doctors || []) as Doctor[];
  const currentDoctor = doctorList.find((d)=>d.user_id===profile.id);
  const roster = (rosterRows || []) as Roster[];
  const patientRows = (patients || []) as Patient[];
  const patientById = new Map(patientRows.map((p)=>[p.id,p]));
  const stayByPatient = new Map(((stays || []) as Stay[]).map((s)=>[s.patient_id,s]));
  const activePermissions = (activePermissionRows || []) as Permission[];
  const permissionByPatient = new Map(activePermissions.map((item)=>[item.patient_id as string,item]));
  const scenarios = (demoScenarioRows || []) as DemoScenario[];
  const scenarioByRoster = new Map(scenarios.map((s)=>[s.roster_id,s]));

  const myRoster = roster.filter((r)=>r.reference_doctor_id===currentDoctor?.id);
  const realPatients: UnifiedPatient[] = myRoster.flatMap((r)=>{
    if (!r.linked_profile_id) return [];
    const p = patientById.get(r.linked_profile_id);
    if (!p) return [];
    const stay = stayByPatient.get(p.id);
    const permission = permissionByPatient.get(p.id);
    return [{
      key:p.id,
      profileId:p.id,
      rosterId:r.id,
      full_name:p.full_name,
      phone:p.phone,
      room_number:stay?.room_number || r.room_number,
      presence:(stay?.presence === "out" ? "out" : "present") as "present" | "out",
      planned_discharge_at:stay?.planned_discharge_at || null,
      permission_status:permission?.status || null,
      isDemo:false,
      scenario:null,
    }];
  });

  const demoPatients: UnifiedPatient[] = myRoster.flatMap((r)=>{
    if (r.linked_profile_id) return [];
    const scenario = scenarioByRoster.get(r.id);
    if (!scenario) return [];
    return [{
      key:`demo:${r.id}`,
      profileId:null,
      rosterId:r.id,
      full_name:r.display_name,
      phone:scenario.mobile_phone,
      room_number:r.room_number,
      presence:scenario.presence,
      planned_discharge_at:scenario.planned_discharge_at,
      permission_status:scenario.permission_status,
      isDemo:true,
      scenario,
    }];
  });

  const basePatients = [...realPatients,...demoPatients].sort((a,b)=>a.full_name.localeCompare(b.full_name,"fr"));
  const patientList = basePatients.filter((patient)=>{
    if(filter==="present") return patient.presence!=="out";
    if(filter==="out") return patient.presence==="out" || patient.permission_status==="departed";
    if(filter==="permission") return ["submitted","waiting"].includes(patient.permission_status || "");
    if(filter==="approved") return patient.permission_status==="approved";
    return true;
  });
  const selected = patientList.find((p)=>p.key===requestedId) || patientList[0];

  const contactByPatient = new Map(((contacts || []) as Contact[]).map((c)=>[c.patient_id,c]));
  const trustedByPatient = new Map(((trustedRows || []) as Trusted[]).map((t)=>[t.patient_id,t]));
  const realContact = selected?.profileId ? contactByPatient.get(selected.profileId) : undefined;
  const realTrusted = selected?.profileId ? trustedByPatient.get(selected.profileId) : undefined;

  const [{ data: permissions }, { data: appointments }, { data: enrollments }] = selected?.profileId ? await Promise.all([
    supabase.from("permission_requests").select("id,departure_at,return_at,reason,status").eq("patient_id",selected.profileId).order("departure_at",{ascending:false}).limit(8),
    supabase.from("appointments").select("id,title,starts_at,ends_at,location").eq("patient_id",selected.profileId).gte("ends_at",new Date().toISOString()).order("starts_at").limit(4),
    supabase.from("activity_enrollments").select("id,activity:activities(title,starts_at,location,requires_prescription)").eq("patient_id",selected.profileId).limit(8),
  ]) : [{data:[]},{data:[]},{data:[]}];

  const scenario = selected?.scenario || null;
  const permissionList: Permission[] = selected?.isDemo && scenario?.permission_status && scenario.permission_departure_at && scenario.permission_return_at
    ? [{ id:`demo-permission-${scenario.id}`, departure_at:scenario.permission_departure_at, return_at:scenario.permission_return_at, reason:"Scénario de démonstration", status:scenario.permission_status }]
    : ((permissions || []) as Permission[]);
  const appointmentList: Appointment[] = selected?.isDemo && scenario?.next_appointment_at
    ? [{ id:`demo-appointment-${scenario.id}`, title:scenario.next_appointment_title || "Rendez-vous médical", starts_at:scenario.next_appointment_at, location:scenario.next_appointment_location }]
    : ((appointments || []) as Appointment[]);
  const enrollmentList = (enrollments || []) as Enrollment[];
  const prescribedActivities = selected?.isDemo
    ? (scenario?.prescribed_activity_title && scenario.prescribed_activity_at ? [{ id:`demo-activity-${scenario.id}`, title:scenario.prescribed_activity_title, starts_at:scenario.prescribed_activity_at, location:scenario.prescribed_activity_location }] : [])
    : enrollmentList.filter(item=>one(item.activity)?.requires_prescription).map((item)=>{ const a=one(item.activity); return { id:item.id,title:a?.title || "Activité",starts_at:a?.starts_at || "",location:a?.location || null }; });
  const otherActivities = selected?.isDemo ? [] : enrollmentList.filter(item=>!one(item.activity)?.requires_prescription);

  const activePermission = permissionList.find((p)=>["submitted","waiting","approved","departed"].includes(p.status));
  const activePortal = !!realTrusted?.portal_enabled && !!realTrusted.consented_at && !realTrusted.revoked_at && !!realTrusted.user_id && (!realTrusted.access_expires_at || new Date(realTrusted.access_expires_at) > new Date());
  const patientPhone = selected?.isDemo ? scenario?.mobile_phone || null : realContact?.mobile_phone || selected?.phone || null;
  const patientEmail = selected?.isDemo ? scenario?.personal_email || null : realContact?.personal_email || null;
  const patientAddress = selected?.isDemo
    ? scenario?.city || "Ville non renseignée"
    : [realContact?.address_line1,[realContact?.postal_code,realContact?.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Adresse non renseignée";
  const trustedName = selected?.isDemo ? scenario?.trusted_contact_name : realTrusted?.full_name;
  const trustedRelationship = selected?.isDemo ? scenario?.trusted_contact_relationship : realTrusted?.relationship;
  const trustedPhone = selected?.isDemo ? scenario?.trusted_contact_phone : realTrusted?.phone;
  const trustedEmail = selected?.isDemo ? scenario?.trusted_contact_email : realTrusted?.email;
  const isEmergencyContact = selected?.isDemo ? false : !!realTrusted?.is_emergency_contact;

  const presentCount=basePatients.filter(p=>p.presence!=="out").length;
  const outCount=basePatients.filter(p=>p.presence==="out" || p.permission_status==="departed").length;
  const pendingCount=basePatients.filter(p=>["submitted","waiting"].includes(p.permission_status||"")).length;
  const approvedCount=basePatients.filter(p=>p.permission_status==="approved").length;

  const filterLink=(key:string,label:string,count:number)=><Link className={filter===key?"patient-filter active":"patient-filter"} href={`/portal/patients?filter=${key}`}><strong>{count}</strong><span>{label}</span></Link>;
  const planningHref = selected?.profileId ? `/portal/appointments?patient=${selected.profileId}` : "/portal/appointments";
  const permissionsHref = selected?.profileId ? `/portal/permissions?patient=${selected.profileId}` : "/portal/permissions";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Médecin référent{currentDoctor?.specialty?` · ${currentDoctor.specialty}`:""}</div><h1>Mes patients</h1><p>Filtrez immédiatement les patients présents, en permission ou en attente de validation.</p></div></div>

    <nav className="patient-dashboard-filters" aria-label="Filtres patients">{filterLink("all","Tous",basePatients.length)}{filterLink("present","Présents",presentCount)}{filterLink("out","En permission",outCount)}{filterLink("permission","À valider",pendingCount)}{filterLink("approved","Permission validée",approvedCount)}</nav>

    <div className="doctor-simple-layout">
      <aside className="doctor-simple-list">
        {patientList.map((patient)=><Link key={patient.key} href={`/portal/patients?filter=${filter}&patient=${encodeURIComponent(patient.key)}`} className={`doctor-simple-patient${selected?.key===patient.key?" active":""}`}><span>{initials(patient.full_name)}</span><div><strong>{patient.full_name}</strong><small>Ch. {patient.room_number || "—"} · {patient.presence === "out" ? "En permission" : ["submitted","waiting"].includes(patient.permission_status || "") ? "Permission à valider" : "Présent"}</small></div></Link>)}
        {!patientList.length && <p className="empty">Aucun patient pour ce filtre.</p>}
      </aside>

      <section className="doctor-simple-record">
        {selected ? <>
          <div className="doctor-simple-header">
            <div><span className="section-kicker">Fiche patient {selected.isDemo && <span className="demo-chip">Données fictives</span>}</span><h2>{selected.full_name}</h2><p>Chambre {selected.room_number || "—"} · {selected.presence === "out" ? "Hors établissement" : "Présent"}{selected.isDemo ? " · patient de contexte non connectable" : ""}</p></div>
            <div className="doctor-simple-actions"><Link className="button button-secondary button-small" href={planningHref}>◷ Planning</Link></div>
          </div>

          <div className="doctor-simple-kpis">
            <div><span>Prochain RDV{currentDoctor?.specialty?` · ${currentDoctor.specialty}`:""}</span><strong>{appointmentList[0] ? formatDateTime(appointmentList[0].starts_at) : "Aucun"}</strong></div>
            <div><span>Permission</span><strong>{activePermission ? activePermission.status === "approved" ? "Validée" : activePermission.status === "departed" ? "En cours" : "À traiter" : "Aucune"}</strong></div>
            <div><span>Sortie prévue</span><strong>{selected.planned_discharge_at ? formatDateTime(selected.planned_discharge_at) : "Non prévue"}</strong></div>
          </div>

          <div className="doctor-simple-grid">
            <article className="doctor-simple-card"><div className="doctor-simple-card-head"><h3>Coordonnées</h3></div>{patientPhone ? <a className="contact-link" href={`tel:${patientPhone.replace(/\s+/g,"")}`}>{patientPhone}</a> : <strong>Téléphone non renseigné</strong>}{patientEmail ? <a className="contact-link" href={`mailto:${patientEmail}`}>{patientEmail}</a> : <span>Email non renseigné</span>}<span>{patientAddress}</span></article>

            <article className="doctor-simple-card doctor-simple-card--trusted"><div className="doctor-simple-card-head"><h3>Personne de confiance</h3>{realTrusted && <span className={activePortal?"badge badge-success":"badge badge-neutral"}>{activePortal?"Portail actif":"Contact uniquement"}</span>}</div>{trustedName ? <><strong>{trustedName} · {trustedRelationship || "Proche"}</strong>{trustedPhone ? <a className="contact-link" href={`tel:${trustedPhone.replace(/\s+/g,"")}`}>☎ {trustedPhone}</a> : <span>Téléphone non renseigné</span>}{trustedEmail ? <a className="button button-secondary button-small" href={`mailto:${trustedEmail}`}>✉ Envoyer un email</a> : <span>Email non renseigné</span>}{isEmergencyContact && <small>Contact d’urgence</small>}</> : <span>Non renseignée</span>}</article>

            <article className="doctor-simple-card"><div className="doctor-simple-card-head"><h3>Prochainement</h3><Link href={planningHref}>Voir tout →</Link></div>{appointmentList.length ? appointmentList.slice(0,3).map((a)=><div className="doctor-simple-row" key={a.id}><strong>{a.title}</strong><span>{formatDateTime(a.starts_at)} · {a.location || "Lieu à confirmer"}</span></div>) : <span>Aucun rendez-vous à venir.</span>}</article>

            <article className="doctor-simple-card"><div className="doctor-simple-card-head"><h3>Permissions</h3><Link href={permissionsHref}>{selected.isDemo ? "Voir les permissions →" : "Traiter →"}</Link></div>{permissionList.length ? permissionList.slice(0,3).map((p)=><div className="doctor-simple-row" key={p.id}><div><strong>{formatDateTime(p.departure_at)}</strong><span>Retour {formatDateTime(p.return_at)}</span></div><StatusBadge status={p.status as PermissionStatus} /></div>) : <span>Aucune permission.</span>}</article>

            <article className="doctor-simple-card doctor-simple-card--prescribed"><div className="doctor-simple-card-head"><h3>Activités prescrites</h3><span className="badge badge-info">{prescribedActivities.length}</span></div>{prescribedActivities.length?prescribedActivities.map(a=><div className="doctor-simple-row" key={a.id}><strong>{a.title}</strong><span>{formatDateTime(a.starts_at)} · {a.location || "Lieu à confirmer"}</span></div>):<span>Aucune activité prescrite.</span>}</article>
          </div>

          {!selected.isDemo && <details className="doctor-simple-more"><summary>Plus d’informations</summary><div className="doctor-simple-more-grid"><div><h3>Autres activités</h3>{otherActivities.map((e)=>{ const a=one(e.activity); return <p key={e.id}><strong>{a?.title || "Activité"}</strong><br/><span>{a ? formatDateTime(a.starts_at) : ""}</span></p>; })}{!otherActivities.length && <p>Aucune autre activité.</p>}</div>{realTrusted && selected.profileId && <div><h3>Partage avec le proche</h3><TrustedContactConsent patientId={selected.profileId} trustedName={realTrusted.full_name} initialEnabled={activePortal} initialScopes={realTrusted.scopes} initialNotifications={realTrusted.notification_preferences} initialExpiresAt={realTrusted.access_expires_at} initialEmergencyContact={realTrusted.is_emergency_contact} initialPreferredContactMethod={realTrusted.preferred_contact_method} canManage hasPortalAccount={!!realTrusted.user_id} /></div>}</div></details>}
        </> : <p className="empty">Aucun patient à afficher.</p>}
      </section>
    </div>
  </PortalShell>;
}
