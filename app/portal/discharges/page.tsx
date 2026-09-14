import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { DischargeForm } from "@/components/stay-planning";
import { OperationalTaskButton } from "@/components/operational-task-button";
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

type TaskRow = {
  id: string;
  stay_id: string | null;
  title: string;
  assigned_role: string;
  due_at: string | null;
  status: string;
};

type StayRef = { id: string; patient_id: string };

const allowed = ["doctor", "nurse", "manager", "governance", "technical", "admin", "reception"];
const patientMessagingRoles = ["doctor", "nurse", "manager"];
const roleLabel: Record<string, string> = { reception: "Accueil", governance: "Gouvernance", technical: "Technique", nurse: "Infirmier" };

export default async function DischargesPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");
  const { patient: requestedPatientId } = await searchParams;
  const supabase = await createClient();
  const [{ data, error }, { data: taskData }, { data: stayRefsData }] = await Promise.all([
    supabase.rpc("discharge_planning_board"),
    supabase.from("operational_tasks").select("id,stay_id,title,assigned_role,due_at,status").like("task_code", "discharge_%").neq("status", "cancelled").order("due_at"),
    supabase.from("patient_stays").select("id,patient_id").is("ended_at", null),
  ]);
  const allRows = (data || []) as DischargeRow[];
  const allTasks = (taskData || []) as TaskRow[];
  const stayRefs = (stayRefsData || []) as StayRef[];
  const patientByStay = new Map(stayRefs.map((stay) => [stay.id, stay.patient_id]));
  const availablePatientIds = new Set(stayRefs.map((stay) => stay.patient_id));
  const selectedPatientId = requestedPatientId && availablePatientIds.has(requestedPatientId) ? requestedPatientId : undefined;
  const rows = selectedPatientId ? allRows.filter((row) => patientByStay.get(row.stay_id) === selectedPatientId) : allRows;
  const tasks = selectedPatientId ? allTasks.filter((task) => !!task.stay_id && patientByStay.get(task.stay_id) === selectedPatientId) : allTasks;
  const selectedPatientName = selectedPatientId ? rows[0]?.patient_name || "Patient sélectionné" : null;
  const canEdit = ["doctor", "nurse", "admin"].includes(profile.role);
  const canMessagePatient = !!selectedPatientId && patientMessagingRoles.includes(profile.role);
  const fmt = (value: string | null | undefined) => formatDateTime(value, profile.facility.locale, profile.facility.timezone);
  const planned = rows.filter((r) => r.planned_discharge_at);
  const unplanned = rows.filter((r) => !r.planned_discharge_at);
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const tasksByStay = new Map<string, TaskRow[]>();
  tasks.forEach((task) => { if (!task.stay_id) return; const current = tasksByStay.get(task.stay_id) || []; current.push(task); tasksByStay.set(task.stay_id, current); });

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Fin d’hospitalisation</div><h1>{selectedPatientName ? `Sortie · ${selectedPatientName}` : "Sorties prévues"}</h1><p>{selectedPatientName ? "Toutes les actions de sortie de ce patient sont regroupées ici." : canEdit ? "Renseignez une seule date : AURA prévient les équipes et génère automatiquement les tâches de préparation." : "Chaque service voit ce qu’il doit préparer, sans recopier la date de sortie."}</p></div>{selectedPatientId && <div className="page-intro-actions"><Link className="button button-secondary" href="/portal/discharges">Toutes les sorties</Link>{profile.role === "doctor" && <Link className="button button-secondary" href={`/portal/patients?patient=${selectedPatientId}`}>Fiche patient</Link>}{canMessagePatient && <Link className="button button-primary" href={`/portal/messages?contact=${selectedPatientId}`}>Message</Link>}</div>}</div>

    <section className="metric-grid" style={{ marginBottom: 18 }}>
      <div className="metric"><strong>{rows.length}</strong><span>{selectedPatientId ? "Séjour" : "Séjours actifs"}</span></div>
      <div className="metric"><strong>{planned.length}</strong><span>Sorties prévues</span></div>
      <div className="metric"><strong>{pendingTasks.length}</strong><span>Tâches à préparer</span></div>
      <div className="metric"><strong>{doneTasks.length}</strong><span>Tâches terminées</span></div>
    </section>

    <section className="card">
      <div className="card-header"><div><h2>{selectedPatientId ? "Préparation de la sortie" : "Planning de sortie orchestré"}</h2><p className="card-subtitle">La date est saisie une fois ; Accueil, Gouvernance, Technique et Infirmier reçoivent leurs actions.</p></div></div>
      <div className="card-body discharge-orchestration-list">
        {error ? <p role="alert">Le planning de sortie n’a pas pu être chargé.</p> : rows.length ? rows.map((row) => {
          const rowTasks = tasksByStay.get(row.stay_id) || [];
          return <article className="discharge-orchestration-card" key={row.stay_id}>
            <div className="discharge-main"><div><span className="section-kicker">{row.room_number ? `Chambre ${row.room_number}` : "Chambre —"}</span><h3>{row.patient_name}</h3><p>Entrée : {fmt(row.started_at)} · {row.presence === "out" ? "Sorti temporairement" : row.presence === "appointment" ? "En rendez-vous" : "Présent"}</p></div><div className="discharge-date"><small>Sortie prévue</small>{row.planned_discharge_at ? <strong>{fmt(row.planned_discharge_at)}</strong> : <span className="badge badge-warning">À planifier</span>}<small>{row.planned_by_name ? `Renseignée par ${row.planned_by_name}` : ""}</small></div></div>
            {canEdit && <div className="discharge-edit"><DischargeForm key={`${row.stay_id}-${row.planned_discharge_at}`} id={row.stay_id} expected={row.planned_discharge_at} /></div>}
            {row.planned_discharge_at && <div className="discharge-task-grid">{rowTasks.length ? rowTasks.map((task) => {
              const canAct = profile.role === task.assigned_role || ["admin", "manager"].includes(profile.role);
              return <div className={`discharge-task ${task.status === "done" ? "discharge-task--done" : ""}`} key={task.id}><div><span>{roleLabel[task.assigned_role] || task.assigned_role}</span><strong>{task.title}</strong><small>{task.due_at ? `Échéance ${fmt(task.due_at)}` : ""}</small></div><div>{task.status === "done" ? <span className="badge badge-success">Terminé</span> : canAct ? <OperationalTaskButton taskId={task.id} /> : <span className="badge badge-warning">À faire</span>}</div></div>;
            }) : <p className="empty">Les tâches opérationnelles seront créées automatiquement.</p>}</div>}
          </article>;
        }) : <p className="empty">{selectedPatientId ? "Aucun séjour actif pour ce patient." : "Aucun séjour actif."}</p>}
      </div>
    </section>

    {unplanned.length > 0 && <p className="form-help">{unplanned.length} séjour{unplanned.length > 1 ? "s" : ""} sans date de sortie prévisionnelle. Une date peut être ajoutée dès qu’elle est suffisamment fiable pour aider les équipes à anticiper.</p>}
  </PortalShell>;
}
