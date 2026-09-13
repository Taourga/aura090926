import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
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

function one<T>(value: Relation<T>) { return Array.isArray(value) ? value[0] : value; }
function floorLabel(roomNumber: string | null) {
  const floor = roomNumber?.trim().charAt(0);
  if (floor === "0") return "RDC";
  if (["1", "2", "3"].includes(floor || "")) return `${floor}er étage`.replace("2er", "2e").replace("3er", "3e");
  return "Étage non renseigné";
}

function History({ permissions, enrollments, appointments }: { permissions: Permission[]; enrollments: Enrollment[]; appointments: Appointment[] }) {
  const entries = [
    ...permissions.flatMap((permission) => [
      { date: permission.created_at, title: "Demande de sortie déposée", detail: permission.reason || "Sans motif renseigné", tone: "permission" },
      ...(permission.doctor_decided_at ? [{ date: permission.doctor_decided_at, title: `Validation médecin ${permission.doctor_decision === "approved" ? "accordée" : "refusée"}`, detail: "Permission de sortie", tone: "validation" }] : []),
      ...(permission.manager_decided_at ? [{ date: permission.manager_decided_at, title: `Validation cadre ${permission.manager_decision === "approved" ? "accordée" : "refusée"}`, detail: "Permission de sortie", tone: "validation" }] : []),
      ...(permission.departed_at ? [{ date: permission.departed_at, title: "Sortie enregistrée", detail: "Mouvement validé à l’accueil", tone: "movement" }] : []),
      ...(permission.returned_at ? [{ date: permission.returned_at, title: "Retour enregistré", detail: "Présence mise à jour", tone: "movement" }] : []),
    ]),
    ...enrollments.map((enrollment) => { const activity = one(enrollment.activity); return { date: enrollment.created_at, title: `Inscription à ${activity?.title || "une activité"}`, detail: activity ? `${formatDateTime(activity.starts_at)} · ${activity.location || "Lieu à confirmer"}` : "Activité du séjour", tone: "activity" }; }),
    ...appointments.map((appointment) => ({ date: appointment.created_at, title: `Rendez-vous ajouté : ${appointment.title}`, detail: `${formatDateTime(appointment.starts_at)} · ${appointment.location || "Lieu à confirmer"}`, tone: "appointment" })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  return <div className="patient-history">{entries.length ? entries.map((entry, index) => <div className="history-row" key={`${entry.date}-${index}`}><span className={`history-marker history-marker--${entry.tone}`} aria-hidden="true" /><div><strong>{entry.title}</strong><p>{entry.detail}</p></div><time>{formatDateTime(entry.date)}</time></div>) : <p className="empty">Aucune action enregistrée pour ce patient.</p>}</div>;
}

export const dynamic = "force-dynamic";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const profile = await requireProfile();
  if (profile.role !== "doctor") redirect("/portal");
  const { patient: requestedPatientId } = await searchParams;
  const supabase = await createClient();
  const [{ data: patients }, { data: stays }, { data: rosterRows }, { data: doctorRows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone").eq("role", "patient").eq("active", true).order("full_name"),
    supabase.from("patient_stays").select("patient_id, room_number, presence, ward:wards(name, floor)").is("ended_at", null),
    supabase.from("clinic_patient_roster").select("linked_profile_id,floor_number,reference_doctor_id").eq("active", true),
    supabase.from("care_team_directory").select("id,full_name,specialty,user_id").eq("member_type", "doctor").eq("active", true).order("full_name"),
  ]);
  const patientList = (patients || []) as Patient[];
  const stayByPatient = new Map(((stays || []) as Stay[]).map((stay) => [stay.patient_id, stay]));
  const roster = (rosterRows || []) as Roster[];
  const doctors = (doctorRows || []) as Doctor[];
  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const currentDoctor = doctors.find((doctor) => doctor.user_id === profile.id);
  const selectedPatient = patientList.find((patient) => patient.id === requestedPatientId) || patientList[0];
  const selectedRoster = selectedPatient ? roster.find((item) => item.linked_profile_id === selectedPatient.id) : undefined;
  const referenceDoctor = selectedRoster ? doctorById.get(selectedRoster.reference_doctor_id) : undefined;
  const myRoster = currentDoctor ? roster.filter((item) => item.reference_doctor_id === currentDoctor.id) : [];
  const myFloors = [...new Set(myRoster.map((item) => item.floor_number))].sort((a,b) => a-b);

  const [{ data: permissions }, { data: enrollments }, { data: appointments }] = selectedPatient ? await Promise.all([
    supabase.from("permission_requests").select("id, departure_at, return_at, reason, status, created_at, doctor_decision, doctor_decided_at, manager_decision, manager_decided_at, departed_at, returned_at").eq("patient_id", selectedPatient.id).order("created_at", { ascending: false }),
    supabase.from("activity_enrollments").select("created_at, activity:activities(title, starts_at, location)").eq("patient_id", selectedPatient.id).order("created_at", { ascending: false }),
    supabase.from("appointments").select("id, title, starts_at, ends_at, location, created_at").eq("patient_id", selectedPatient.id).order("starts_at", { ascending: false }),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const selectedStay = selectedPatient ? stayByPatient.get(selectedPatient.id) : undefined;
  const patientPermissions = (permissions || []) as Permission[];
  const patientEnrollments = (enrollments || []) as Enrollment[];
  const patientAppointments = (appointments || []) as Appointment[];

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Patients</h1><p>Sélectionnez un patient pour consulter son séjour, son médecin référent et son historique.</p></div><Link className="button button-secondary" href="/portal/appointments">Voir le planning</Link></div>
    <section className="metric-grid" style={{ marginBottom: 18 }}>
      <div className="metric"><span>Patients dans la clinique</span><strong>{roster.length}</strong><div className="metric-detail">Roster opérationnel de démonstration</div></div>
      <div className="metric"><span>Médecins référents</span><strong>{doctors.length}</strong><div className="metric-detail">Répartition multi-étages</div></div>
      <div className="metric"><span>Mes patients référents</span><strong>{myRoster.length}</strong><div className="metric-detail">{myFloors.length ? `Présents sur ${myFloors.length} étage${myFloors.length > 1 ? "s" : ""}` : "Aucun rattachement"}</div></div>
      <div className="metric"><span>Étages couverts</span><strong>{myFloors.length}</strong><div className="metric-detail">{myFloors.map((floor) => floor === 0 ? "RDC" : `${floor}e`).join(" · ") || "—"}</div></div>
    </section>
    <div className="doctor-patient-workspace">
      <aside className="patient-directory card"><div className="card-header"><div><h2>Patients interactifs démo</h2><p className="card-subtitle">{patientList.length} profils connectables sur un roster de {roster.length}</p></div></div><div className="patient-directory-list">{patientList.length ? patientList.map((patient) => {
        const stay = stayByPatient.get(patient.id); const selected = selectedPatient?.id === patient.id; const rosterItem = roster.find((item) => item.linked_profile_id === patient.id); const doctor = rosterItem ? doctorById.get(rosterItem.reference_doctor_id) : undefined;
        return <Link key={patient.id} href={`/portal/patients?patient=${patient.id}`} className={`patient-select ${selected ? "patient-select--active" : ""}`}><span className="patient-avatar" aria-hidden="true">{patient.full_name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase()}</span><span><strong>{patient.full_name}</strong><small>{stay ? `${floorLabel(stay.room_number)} · Chambre ${stay.room_number || "—"}` : "Aucun séjour actif"}</small><small>{doctor ? `Référent : ${doctor.full_name}` : "Référent à définir"}</small></span>{stay && <i className={`presence-dot presence-dot--${stay.presence}`} aria-label={stay.presence === "present" ? "Présent" : "Sorti"} />}</Link>;
      }) : <p className="empty">Aucun patient actif.</p>}</div></aside>

      <section className="patient-record">{selectedPatient ? <>
        <section className="record-header"><div><p className="section-kicker">Dossier de séjour</p><h2>{selectedPatient.full_name}</h2><p>{selectedStay ? `${floorLabel(selectedStay.room_number)} · Chambre ${selectedStay.room_number || "—"}` : "Aucun séjour actif"}{selectedPatient.phone ? ` · ${selectedPatient.phone}` : ""}</p></div><span className={`presence-pill ${selectedStay?.presence === "present" ? "presence-pill--present" : "presence-pill--out"}`}>{selectedStay?.presence === "out" ? "Sorti" : "Présent"}</span></section>
        {referenceDoctor && <section className="work-card" style={{ marginBottom: 14 }}><div className="work-card-head"><div><p className="section-kicker">Médecin référent</p><h2>{referenceDoctor.full_name}</h2></div><span className="badge badge-info">{referenceDoctor.specialty || "Médecin"}</span></div><div className="work-card-body"><p className="row-meta">Responsable principal du suivi de ce patient. Les passages d’étage peuvent être assurés par un autre médecin.</p></div></section>}
        <div className="patient-record-grid">
          <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Permissions</p><h2>Demandes et validations</h2></div><Link href="/portal/permissions" className="text-link">Tout voir</Link></div><div className="work-card-body">{patientPermissions.length ? patientPermissions.map((permission) => <div className="record-row" key={permission.id}><div><strong>Sortie du {formatDateTime(permission.departure_at)}</strong><small>Retour prévu : {formatDateTime(permission.return_at)}{permission.reason ? ` · ${permission.reason}` : ""}</small></div><StatusBadge status={permission.status as PermissionStatus} /></div>) : <p className="empty">Aucune demande de sortie.</p>}</div></section>
          <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Activités</p><h2>Inscriptions du patient</h2></div></div><div className="work-card-body">{patientEnrollments.length ? patientEnrollments.map((enrollment, index) => { const activity = one(enrollment.activity); return <div className="record-row" key={`${enrollment.created_at}-${index}`}><div><strong>{activity?.title || "Activité"}</strong><small>{activity ? `${formatDateTime(activity.starts_at)} · ${activity.location || "Lieu à confirmer"}` : "Activité non disponible"}</small></div><span className="badge badge-info">Inscrit</span></div>; }) : <p className="empty">Aucune activité enregistrée.</p>}</div></section>
          <section className="work-card patient-record-grid--wide"><div className="work-card-head"><div><p className="section-kicker">Planning du patient</p><h2>Rendez-vous</h2></div></div><div className="work-card-body">{patientAppointments.length ? patientAppointments.map((appointment) => <div className="record-row" key={appointment.id}><div><strong>{appointment.title}</strong><small>{formatDateTime(appointment.starts_at)} · {appointment.location || "Lieu à confirmer"}</small></div><span className="badge badge-neutral">Prévu</span></div>) : <p className="empty">Aucun rendez-vous enregistré.</p>}</div></section>
          <section className="work-card patient-record-grid--wide"><div className="work-card-head"><div><p className="section-kicker">Historique du séjour</p><h2>Actions et événements</h2></div></div><div className="work-card-body"><History permissions={patientPermissions} enrollments={patientEnrollments} appointments={patientAppointments} /></div></section>
        </div>
      </> : <section className="work-card"><div className="queue-empty"><span aria-hidden="true">—</span>Aucun patient à afficher.</div></section>}</section>
    </div>
  </PortalShell>;
}
