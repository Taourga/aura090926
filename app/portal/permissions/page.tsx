import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { PermissionCalendar } from "@/components/permission-calendar";
import { MovementActions, PermissionDecisionActions } from "@/components/permission-actions";
import { StatusBadge } from "@/components/status-badge";
import { facilitySettingNumber, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import type { PermissionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function DecisionText({ value }: { value: string | null }) {
  if (value === "approved") return <span className="badge badge-success">Accord</span>;
  if (value === "refused") return <span className="badge badge-danger">Refus</span>;
  return <span className="badge badge-warning">À traiter</span>;
}

function WaitingFor({ doctor, manager, status }: { doctor: string | null; manager: string | null; status: string }) {
  if (!["submitted","waiting"].includes(status)) return null;
  const missing=[!doctor?"médecin":null,!manager?"cadre":null].filter(Boolean);
  if(!missing.length)return null;
  return <small className="permission-waiting-for">En attente de validation : <strong>{missing.join(" + ")}</strong></small>;
}

export default async function PermissionsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const profile = await requireProfile();
  const { patient: requestedPatientId } = await searchParams;
  const supabase = await createClient();
  const minNoticeHours = facilitySettingNumber(profile, "permissions.min_notice_hours", 48);
  const displayDateTime = (value: string | null | undefined) => formatDateTime(value, profile.facility.locale, profile.facility.timezone);

  let contextualPatient: { id: string; full_name: string } | null = null;
  if (profile.role !== "patient" && requestedPatientId) {
    const { data } = await supabase.from("profiles").select("id,full_name").eq("id", requestedPatientId).eq("role", "patient").maybeSingle();
    contextualPatient = data;
  }

  let query = supabase.from("permission_requests").select("id, patient_id, departure_at, return_at, reason, status, doctor_decision, manager_decision, departed_at, returned_at, patient:profiles!permission_requests_patient_id_fkey(full_name)").order("departure_at", { ascending: false }).limit(80);
  if (profile.role === "patient") query = query.eq("patient_id", profile.id);
  else if (contextualPatient) query = query.eq("patient_id", contextualPatient.id);
  const { data: permissions } = await query;
  const title = profile.role === "patient" ? "Mes permissions" : contextualPatient ? `Permissions · ${contextualPatient.full_name}` : profile.role === "reception" ? "Départs et retours" : "Permissions";
  const subtitle = profile.role === "patient" ? "Votre calendrier d’abord : cliquez sur un jour pour demander, consulter, modifier ou annuler une permission." : contextualPatient ? "Vue filtrée sur le patient sélectionné : décision, validateur attendu et historique au même endroit." : profile.role === "reception" ? "Enregistrez l’heure réelle au moment du départ et du retour." : "Consultez et traitez les demandes selon votre périmètre.";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Sorties temporaires</div><h1>{title}</h1><p>{subtitle}</p></div>{contextualPatient && profile.role === "doctor" && <div className="page-intro-actions"><Link className="button button-secondary" href={`/portal/patients?patient=${contextualPatient.id}`}>← Fiche patient</Link></div>}</div>

    {profile.role === "patient" && <>
      <PermissionCalendar permissions={(permissions || []).map((item) => ({ id: item.id, departure_at: item.departure_at, return_at: item.return_at, reason: item.reason, status: item.status }))} locale={profile.facility.locale || "fr-FR"} timezone={profile.facility.timezone} minNoticeHours={minNoticeHours} />
      <section className="permission-hero permission-hero--after-calendar"><div><span className="permission-step">1</span><strong>Cliquez sur un jour</strong><small>Un jour vide crée une nouvelle demande.</small></div><div><span className="permission-step">2</span><strong>Suivez les validations</strong><small>Vous voyez qui doit encore valider : médecin ou cadre.</small></div><div><span className="permission-step">3</span><strong>Gérez depuis le calendrier</strong><small>Orange = attente · Vert = validée · refus masqués.</small></div></section>
    </>}

    <section className="card"><div className="card-header"><div><h2>{profile.role === "patient" ? "Historique de mes demandes" : contextualPatient ? `Demandes de ${contextualPatient.full_name}` : "Liste des permissions"}</h2><p className="card-subtitle">Détail, validateur attendu et état actuel des demandes.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr>{profile.role !== "patient" && <th>Patient</th>}<th>Départ prévu</th><th>Retour prévu</th><th>Statut</th>{profile.role !== "patient" && <><th>Médecin</th><th>Cadre</th></>}<th>Action</th></tr></thead><tbody>{permissions?.length ? permissions.map((item) => {
      const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient;
      const mutable = !["departed","returned","cancelled"].includes(item.status);
      const canReview = mutable && (profile.role === "doctor" || profile.role === "manager");
      const currentDecision = profile.role === "doctor" ? item.doctor_decision : profile.role === "manager" ? item.manager_decision : null;
      const receptionAction = profile.role === "reception" && (item.status === "approved" || item.status === "departed") ? (item.status === "approved" ? "depart" : "return") : null;
      return <tr key={item.id}>{profile.role !== "patient" && <td><strong>{patient?.full_name || "Patient"}</strong></td>}<td>{displayDateTime(item.departure_at)}</td><td>{displayDateTime(item.return_at)}</td><td><StatusBadge status={item.status as PermissionStatus} /><WaitingFor doctor={item.doctor_decision} manager={item.manager_decision} status={item.status}/></td>{profile.role !== "patient" && <><td><DecisionText value={item.doctor_decision} /></td><td><DecisionText value={item.manager_decision} /></td></>}<td>{canReview ? <PermissionDecisionActions permissionId={item.id} currentDecision={currentDecision} /> : receptionAction ? <MovementActions permissionId={item.id} action={receptionAction} /> : <span className="row-meta">{item.returned_at ? "Clôturée" : item.departed_at ? "Patient sorti" : profile.role === "patient" && ["submitted","waiting","approved"].includes(item.status) ? "Gérer dans le calendrier" : "Aucune action"}</span>}</td></tr>;
    }) : <tr><td colSpan={profile.role === "patient" ? 4 : 7} className="empty">Aucune permission à afficher{contextualPatient ? " pour ce patient" : ""}.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
