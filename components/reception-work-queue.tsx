import Link from "next/link";
import { MovementActions } from "@/components/permission-actions";
import { VisitMovementActions } from "@/components/visit-actions";
import { BulletinReceptionActions } from "@/components/bulletin-request-button";
import { OperationalTaskButton } from "@/components/operational-task-button";
import { CompletePatientHelpButton } from "@/components/patient-help-feedback";
import { formatTime } from "@/lib/format";

type Rel = { full_name: string | null } | { full_name: string | null }[] | null;
const nameOf = (rel: Rel) => (Array.isArray(rel) ? rel[0]?.full_name : rel?.full_name) || "Patient";

type Permission = { id: string; status: string; departure_at: string; return_at: string; patient: Rel };
type Visit = { id: string; status: string; scheduled_start: string; visitor_one_name: string; patient: Rel };
type Bulletin = { id: string; status: string; requested_at: string; email_to: string | null; patient: Rel };
type Task = { id: string; title: string; due_at: string | null; patient: Rel };
type Discharge = { stay_id: string; patient_name: string; room_number: string | null; planned_discharge_at: string | null };
type Help = { id: string; category: string; message: string | null; created_at: string; patient: Rel };

type QueueItem = {
  key: string;
  priority: number;
  sortAt: number;
  label: string;
  patient: string;
  meta: string;
  action: React.ReactNode;
};

export function ReceptionWorkQueue({ permissions, visits, bulletins, tasks, discharges, helpRequests, locale, timezone }: {
  permissions: Permission[];
  visits: Visit[];
  bulletins: Bulletin[];
  tasks: Task[];
  discharges: Discharge[];
  helpRequests: Help[];
  locale: string;
  timezone: string;
}) {
  const now = Date.now();
  const tm = (value: string) => formatTime(value, locale, timezone);
  const items: QueueItem[] = [
    ...permissions.filter((p) => p.status === "departed").map((p) => ({
      key: `ret-${p.id}`,
      priority: new Date(p.return_at).getTime() < now ? 0 : 1,
      sortAt: new Date(p.return_at).getTime(),
      label: new Date(p.return_at).getTime() < now ? "RETARD" : "RETOUR",
      patient: nameOf(p.patient),
      meta: `prévu ${tm(p.return_at)}`,
      action: <MovementActions permissionId={p.id} action="return" />,
    })),
    ...permissions.filter((p) => p.status === "approved").map((p) => ({
      key: `dep-${p.id}`,
      priority: 1,
      sortAt: new Date(p.departure_at).getTime(),
      label: "DÉPART",
      patient: nameOf(p.patient),
      meta: `prévu ${tm(p.departure_at)}`,
      action: <MovementActions permissionId={p.id} action="depart" />,
    })),
    ...visits.filter((v) => v.status === "arrived").map((v) => ({
      key: `vd-${v.id}`,
      priority: 1,
      sortAt: now,
      label: "VISITE",
      patient: `${v.visitor_one_name} · ${nameOf(v.patient)}`,
      meta: "visiteur présent",
      action: <VisitMovementActions visitId={v.id} action="depart" />,
    })),
    ...visits.filter((v) => v.status === "scheduled").map((v) => ({
      key: `va-${v.id}`,
      priority: 2,
      sortAt: new Date(v.scheduled_start).getTime(),
      label: "VISITE",
      patient: `${v.visitor_one_name} · ${nameOf(v.patient)}`,
      meta: tm(v.scheduled_start),
      action: <VisitMovementActions visitId={v.id} action="arrive" />,
    })),
    ...bulletins.map((b) => ({
      key: `bul-${b.id}`,
      priority: 2,
      sortAt: new Date(b.requested_at).getTime(),
      label: "BULLETIN",
      patient: nameOf(b.patient),
      meta: b.status === "pending" ? "à générer" : "à envoyer",
      action: <BulletinReceptionActions requestId={b.id} status={b.status} />,
    })),
    ...helpRequests.map((h) => ({
      key: `help-${h.id}`,
      priority: 2,
      sortAt: new Date(h.created_at).getTime(),
      label: "DEMANDE",
      patient: nameOf(h.patient),
      meta: h.message || h.category,
      action: <CompletePatientHelpButton id={h.id} />,
    })),
    ...tasks.map((t) => ({
      key: `task-${t.id}`,
      priority: 3,
      sortAt: t.due_at ? new Date(t.due_at).getTime() : now + 86400000,
      label: "TÂCHE",
      patient: nameOf(t.patient),
      meta: t.title,
      action: <OperationalTaskButton taskId={t.id} />,
    })),
    ...discharges.filter((d) => d.planned_discharge_at).map((d) => ({
      key: `dis-${d.stay_id}`,
      priority: 3,
      sortAt: new Date(d.planned_discharge_at as string).getTime(),
      label: "SORTIE",
      patient: d.patient_name,
      meta: `ch. ${d.room_number || "—"}`,
      action: <Link className="button button-secondary button-small" href="/portal/discharges">Ouvrir</Link>,
    })),
  ].sort((a, b) => a.priority - b.priority || a.sortAt - b.sortAt);

  const visible = items.slice(0, 10);
  return <section className="reception-fastqueue">
    <div className="reception-fastqueue-head">
      <div><span className="section-kicker">Accueil</span><h1>À faire maintenant</h1><p>Une ligne, une personne, une action.</p></div>
      <strong>{items.length}</strong>
    </div>
    <div className="reception-fastqueue-list">
      {visible.length ? visible.map((item) => <div className={`reception-fastqueue-row${item.priority === 0 ? " reception-fastqueue-row--urgent" : ""}`} key={item.key}>
        <span className="reception-fastqueue-kind">{item.label}</span>
        <div className="reception-fastqueue-person"><strong>{item.patient}</strong><small>{item.meta}</small></div>
        <div className="reception-fastqueue-action">{item.action}</div>
      </div>) : <div className="queue-empty"><span aria-hidden="true">✓</span>Rien à traiter maintenant.</div>}
    </div>
    {items.length > visible.length && <p className="reception-fastqueue-more">+ {items.length - visible.length} action{items.length - visible.length > 1 ? "s" : ""} ensuite</p>}
  </section>;
}
