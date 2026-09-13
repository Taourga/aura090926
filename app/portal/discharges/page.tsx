import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { DischargeForm } from "@/components/stay-planning";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type DischargeRow = {
  stay_id: string;
  patient_name: string;
  room_number: string | null;
  started_at: string;
  planned_discharge_at: string | null;
  presence: string;
  planned_by_name: string | null;
};

const allowed = ["doctor", "nurse", "manager", "governance", "technical", "admin", "reception"];

export default async function DischargesPage() {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("discharge_planning_board");
  const rows = (data || []) as DischargeRow[];
  const canEdit = ["doctor", "nurse", "admin"].includes(profile.role);
  const fmt = (value: string) => formatDateTime(value, profile.facility.locale, profile.facility.timezone);
  const planned = rows.filter((r) => r.planned_discharge_at);
  const unplanned = rows.filter((r) => !r.planned_discharge_at);

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Sorties prévues</h1><p>{canEdit ? "Renseignez la date prévisionnelle de fin d’hospitalisation. Elle est immédiatement partagée avec les équipes concernées." : "Anticipez les chambres, repas et besoins logistiques à partir des prévisions médicales et soignantes."}</p></div></div>

    <section className="metric-grid" style={{ marginBottom: 18 }}>
      <div className="metric"><strong>{rows.length}</strong><span>Séjours actifs</span></div>
      <div className="metric"><strong>{planned.length}</strong><span>Sorties déjà prévues</span></div>
      <div className="metric"><strong>{unplanned.length}</strong><span>Dates à renseigner</span></div>
    </section>

    <section className="card">
      <div className="card-header"><div><h2>Planning de sortie</h2><p className="card-subtitle">Informations opérationnelles partagées · établissement courant uniquement.</p></div></div>
      <div className="card-body data-table-wrap">
        {error ? <p role="alert">Le planning de sortie n’a pas pu être chargé.</p> : <table className="data-table"><thead><tr><th>Patient</th><th>Chambre</th><th>Entrée</th><th>Présence</th><th>Sortie prévue</th><th>Renseignée par</th>{canEdit && <th>Action</th>}</tr></thead><tbody>
          {rows.map((row) => <tr key={row.stay_id}><td><strong>{row.patient_name}</strong></td><td>{row.room_number || "—"}</td><td>{fmt(row.started_at)}</td><td><span className="badge badge-info">{row.presence === "out" ? "Sorti temporairement" : row.presence === "appointment" ? "En rendez-vous" : "Présent"}</span></td><td>{row.planned_discharge_at ? <strong>{fmt(row.planned_discharge_at)}</strong> : <span className="badge badge-warning">À planifier</span>}</td><td>{row.planned_by_name || "—"}</td>{canEdit && <td><DischargeForm key={`${row.stay_id}-${row.planned_discharge_at}`} id={row.stay_id} expected={row.planned_discharge_at} /></td>}</tr>)}
          {!rows.length && <tr><td colSpan={canEdit ? 7 : 6} className="empty">Aucun séjour actif.</td></tr>}
        </tbody></table>}
      </div>
    </section>
  </PortalShell>;
}
