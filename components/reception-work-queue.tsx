import Link from "next/link";
import { MovementActions } from "@/components/permission-actions";
import { VisitMovementActions } from "@/components/visit-actions";
import { BulletinReceptionActions } from "@/components/bulletin-request-button";
import { OperationalTaskButton } from "@/components/operational-task-button";
import { formatDateTime } from "@/lib/format";

type Rel = { full_name: string | null } | { full_name: string | null }[] | null;
const nameOf = (rel: Rel) => (Array.isArray(rel) ? rel[0]?.full_name : rel?.full_name) || "Patient";

type Permission = { id: string; status: string; departure_at: string; return_at: string; patient: Rel };
type Visit = { id: string; status: string; scheduled_start: string; visitor_one_name: string; patient: Rel };
type Bulletin = { id: string; status: string; requested_at: string; email_to: string | null; patient: Rel };
type Task = { id: string; title: string; due_at: string | null; patient: Rel };
type Discharge = { stay_id: string; patient_name: string; room_number: string | null; planned_discharge_at: string | null };

type QueueItem = {
  key: string;
  sortAt: number;
  kind: "departure" | "return" | "visit-arrival" | "visit-departure" | "bulletin" | "task" | "discharge";
  title: string;
  detail: string;
  payload: Permission | Visit | Bulletin | Task | Discharge;
};

export function ReceptionWorkQueue({ permissions, visits, bulletins, tasks, discharges, locale, timezone }: {
  permissions: Permission[];
  visits: Visit[];
  bulletins: Bulletin[];
  tasks: Task[];
  discharges: Discharge[];
  locale: string;
  timezone: string;
}) {
  const fmt = (v: string | null | undefined) => formatDateTime(v, locale, timezone);
  const now = Date.now();
  const items: QueueItem[] = [
    ...permissions.filter((p) => p.status === "approved").map((p) => ({ key: `dep-${p.id}`, sortAt: new Date(p.departure_at).getTime(), kind: "departure" as const, title: `Départ · ${nameOf(p.patient)}`, detail: `Prévu ${fmt(p.departure_at)}`, payload: p })),
    ...permissions.filter((p) => p.status === "departed").map((p) => ({ key: `ret-${p.id}`, sortAt: new Date(p.return_at).getTime(), kind: "return" as const, title: `Retour · ${nameOf(p.patient)}`, detail: `${new Date(p.return_at).getTime() < now ? "En retard · " : "Prévu · "}${fmt(p.return_at)}`, payload: p })),
    ...visits.filter((v) => v.status === "scheduled").map((v) => ({ key: `va-${v.id}`, sortAt: new Date(v.scheduled_start).getTime(), kind: "visit-arrival" as const, title: `Visite · ${v.visitor_one_name}`, detail: `${nameOf(v.patient)} · ${fmt(v.scheduled_start)}`, payload: v })),
    ...visits.filter((v) => v.status === "arrived").map((v) => ({ key: `vd-${v.id}`, sortAt: now - 1000, kind: "visit-departure" as const, title: `Visiteur sur site · ${v.visitor_one_name}`, detail: `${nameOf(v.patient)} · départ à enregistrer`, payload: v })),
    ...bulletins.map((b) => ({ key: `bul-${b.id}`, sortAt: new Date(b.requested_at).getTime(), kind: "bulletin" as const, title: `Bulletin · ${nameOf(b.patient)}`, detail: `${b.status === "pending" ? "À générer" : "À envoyer"}${b.email_to ? ` · ${b.email_to}` : ""}`, payload: b })),
    ...tasks.map((t) => ({ key: `task-${t.id}`, sortAt: t.due_at ? new Date(t.due_at).getTime() : now + 86400000, kind: "task" as const, title: t.title, detail: `${nameOf(t.patient)}${t.due_at ? ` · ${fmt(t.due_at)}` : ""}`, payload: t })),
    ...discharges.filter((d) => d.planned_discharge_at).map((d) => ({ key: `dis-${d.stay_id}`, sortAt: new Date(d.planned_discharge_at as string).getTime(), kind: "discharge" as const, title: `Sortie définitive · ${d.patient_name}`, detail: `Chambre ${d.room_number || "—"} · ${fmt(d.planned_discharge_at)}`, payload: d })),
  ].sort((a, b) => a.sortAt - b.sortAt);

  return <section className="reception-queue-card">
    <div className="reception-queue-head"><div><p className="section-kicker">File de travail unique</p><h2>À traiter à l’accueil</h2><p>Départs, retours, visites, documents et sorties définitives dans une seule liste.</p></div><span className="count-pill">{items.length}</span></div>
    <div className="reception-queue-list">{items.length ? items.slice(0, 14).map((item) => <div className={`reception-queue-row reception-queue-row--${item.kind}`} key={item.key}>
      <div className="reception-queue-icon" aria-hidden="true">{item.kind === "departure" ? "↗" : item.kind === "return" ? "↙" : item.kind.startsWith("visit") ? "♧" : item.kind === "bulletin" ? "▤" : item.kind === "task" ? "✓" : "⇥"}</div>
      <div className="reception-queue-copy"><strong>{item.title}</strong><small>{item.detail}</small></div>
      <div className="reception-queue-action">
        {item.kind === "departure" && <MovementActions permissionId={(item.payload as Permission).id} action="depart" />}
        {item.kind === "return" && <MovementActions permissionId={(item.payload as Permission).id} action="return" />}
        {item.kind === "visit-arrival" && <VisitMovementActions visitId={(item.payload as Visit).id} action="arrive" />}
        {item.kind === "visit-departure" && <VisitMovementActions visitId={(item.payload as Visit).id} action="depart" />}
        {item.kind === "bulletin" && <BulletinReceptionActions requestId={(item.payload as Bulletin).id} status={(item.payload as Bulletin).status} />}
        {item.kind === "task" && <OperationalTaskButton taskId={(item.payload as Task).id} />}
        {item.kind === "discharge" && <Link className="button button-secondary button-small" href="/portal/discharges">Ouvrir</Link>}
      </div>
    </div>) : <div className="queue-empty"><span aria-hidden="true">✓</span>Rien à traiter pour le moment.</div>}</div>
  </section>;
}
