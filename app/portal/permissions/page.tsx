import { PortalShell } from "@/components/portal-shell";
import { PermissionForm } from "@/components/permission-form";
import { MovementActions, PermissionDecisionActions } from "@/components/permission-actions";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import type { PermissionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function DecisionText({ value }: { value: string | null }) {
  if (value === "approved") return <span className="badge badge-success">Accord</span>;
  if (value === "refused") return <span className="badge badge-danger">Refus</span>;
  return <span className="badge badge-warning">À traiter</span>;
}

export default async function PermissionsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const patientFilter = profile.role === "patient" ? { column: "patient_id", value: profile.id } : null;
  let query = supabase.from("permission_requests").select("id, patient_id, departure_at, return_at, reason, status, doctor_decision, manager_decision, departed_at, returned_at, patient:profiles!permission_requests_patient_id_fkey(full_name)").order("departure_at", { ascending: false }).limit(50);
  if (patientFilter) query = query.eq(patientFilter.column, patientFilter.value);
  const { data: permissions } = await query;
  const title = profile.role === "patient" ? "Mes permissions de sortie" : profile.role === "reception" ? "Départs et retours" : "Permissions de sortie";
  const subtitle = profile.role === "patient" ? "Votre sortie est autorisée uniquement avec la validation du médecin et du cadre." : profile.role === "reception" ? "Enregistrez l’heure réelle au moment du départ et du retour." : "Consultez et traitez les demandes selon votre périmètre.";
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>{title}</h1><p>{subtitle}</p></div></div>
    {profile.role === "patient" && <section className="card" style={{ marginBottom: 18 }}><div className="card-header"><div><h2>Nouvelle demande</h2><p className="card-subtitle">Les deux validations sont nécessaires avant tout départ.</p></div></div><div className="card-body"><PermissionForm /></div></section>}
    <section className="card"><div className="card-header"><div><h2>{profile.role === "patient" ? "Historique de mes demandes" : "Liste des permissions"}</h2><p className="card-subtitle">Les actions sont horodatées et conservées.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr>{profile.role !== "patient" && <th>Patient</th>}<th>Départ prévu</th><th>Retour prévu</th><th>Statut</th>{profile.role !== "patient" && <><th>Médecin</th><th>Cadre</th></>}<th>Action</th></tr></thead><tbody>{permissions?.length ? permissions.map((item) => {
      const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient;
      const canReview = (profile.role === "doctor" && !item.doctor_decision) || (profile.role === "manager" && !item.manager_decision);
      const receptionAction = profile.role === "reception" && (item.status === "approved" || item.status === "departed") ? (item.status === "approved" ? "depart" : "return") : null;
      return <tr key={item.id}>{profile.role !== "patient" && <td><strong>{patient?.full_name || "Patient"}</strong></td>}<td>{formatDateTime(item.departure_at)}</td><td>{formatDateTime(item.return_at)}</td><td><StatusBadge status={item.status as PermissionStatus} /></td>{profile.role !== "patient" && <><td><DecisionText value={item.doctor_decision} /></td><td><DecisionText value={item.manager_decision} /></td></>}<td>{canReview ? <PermissionDecisionActions permissionId={item.id} /> : receptionAction ? <MovementActions permissionId={item.id} action={receptionAction} /> : <span className="row-meta">{item.returned_at ? "Clôturée" : item.departed_at ? "Patient sorti" : "Aucune action"}</span>}</td></tr>;
    }) : <tr><td colSpan={profile.role === "patient" ? 4 : 7} className="empty">Aucune permission à afficher.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
