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

export default async function PermissionsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const minNoticeHours = facilitySettingNumber(profile, "permissions.min_notice_hours", 48);
  const displayDateTime = (value: string | null | undefined) => formatDateTime(value, profile.facility.locale, profile.facility.timezone);
  let query = supabase.from("permission_requests").select("id, patient_id, departure_at, return_at, reason, status, doctor_decision, manager_decision, departed_at, returned_at, patient:profiles!permission_requests_patient_id_fkey(full_name)").order("departure_at", { ascending: false }).limit(80);
  if (profile.role === "patient") query = query.eq("patient_id", profile.id);
  const { data: permissions } = await query;
  const title = profile.role === "patient" ? "Mes permissions" : profile.role === "reception" ? "Départs et retours" : "Permissions";
  const subtitle = profile.role === "patient" ? "Votre calendrier d’abord : cliquez sur un jour pour demander, consulter, modifier ou annuler une permission." : profile.role === "reception" ? "Enregistrez l’heure réelle au moment du départ et du retour." : "Consultez et traitez les demandes selon votre périmètre.";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Sorties temporaires</div><h1>{title}</h1><p>{subtitle}</p></div></div>

    {profile.role === "patient" && <>
      <PermissionCalendar
        permissions={(permissions || []).map((item) => ({ id: item.id, departure_at: item.departure_at, return_at: item.return_at, reason: item.reason, status: item.status }))}
        locale={profile.facility.locale || "fr-FR"}
        timezone={profile.facility.timezone}
        minNoticeHours={minNoticeHours}
      />
      <section className="permission-hero permission-hero--after-calendar"><div><span className="permission-step">1</span><strong>Cliquez sur un jour</strong><small>Un jour vide crée une nouvelle demande.</small></div><div><span className="permission-step">2</span><strong>Un clic suffit</strong><small>10 h → 17 h par défaut, ou jusqu’à 24 h avec une nuit.</small></div><div><span className="permission-step">3</span><strong>Gérez depuis le calendrier</strong><small>Orange = attente · Vert = validée · refus masqués.</small></div></section>
    </>}

    <section className="card"><div className="card-header"><div><h2>{profile.role === "patient" ? "Historique de mes demandes" : "Liste des permissions"}</h2><p className="card-subtitle">Détail et état actuel des demandes.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr>{profile.role !== "patient" && <th>Patient</th>}<th>Départ prévu</th><th>Retour prévu</th><th>Statut</th>{profile.role !== "patient" && <><th>Médecin</th><th>Cadre</th></>}<th>Action</th></tr></thead><tbody>{permissions?.length ? permissions.map((item) => {
      const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient;
      const canReview = (profile.role === "doctor" && !item.doctor_decision) || (profile.role === "manager" && !item.manager_decision);
      const receptionAction = profile.role === "reception" && (item.status === "approved" || item.status === "departed") ? (item.status === "approved" ? "depart" : "return") : null;
      return <tr key={item.id}>{profile.role !== "patient" && <td><strong>{patient?.full_name || "Patient"}</strong></td>}<td>{displayDateTime(item.departure_at)}</td><td>{displayDateTime(item.return_at)}</td><td><StatusBadge status={item.status as PermissionStatus} /></td>{profile.role !== "patient" && <><td><DecisionText value={item.doctor_decision} /></td><td><DecisionText value={item.manager_decision} /></td></>}<td>{canReview ? <PermissionDecisionActions permissionId={item.id} /> : receptionAction ? <MovementActions permissionId={item.id} action={receptionAction} /> : <span className="row-meta">{item.returned_at ? "Clôturée" : item.departed_at ? "Patient sorti" : profile.role === "patient" && ["submitted","waiting","approved"].includes(item.status) ? "Gérer dans le calendrier" : "Aucune action"}</span>}</td></tr>;
    }) : <tr><td colSpan={profile.role === "patient" ? 4 : 7} className="empty">Aucune permission à afficher.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
