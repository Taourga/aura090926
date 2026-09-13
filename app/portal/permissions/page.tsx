import { PortalShell } from "@/components/portal-shell";
import { PermissionForm } from "@/components/permission-form";
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

function localDateKey(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function monthCalendar(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: mondayOffset + count }, (_, index) => index < mondayOffset ? null : index - mondayOffset + 1);
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
  const subtitle = profile.role === "patient" ? "Choisissez vos horaires, envoyez la demande et suivez sa validation simplement." : profile.role === "reception" ? "Enregistrez l’heure réelle au moment du départ et du retour." : "Consultez et traitez les demandes selon votre périmètre.";

  const visibleCalendar = (permissions || []).filter((item) => ["submitted", "waiting", "approved", "departed", "returned"].includes(item.status));
  const now = new Date();
  const months = [{ year: now.getFullYear(), month: now.getMonth() }, { year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), month: (now.getMonth() + 1) % 12 }];
  const monthLabel = (year: number, month: number) => new Intl.DateTimeFormat(profile.facility.locale || "fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month, 1));

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Sorties temporaires</div><h1>{title}</h1><p>{subtitle}</p></div></div>
    {profile.role === "patient" && <>
      <section className="permission-hero"><div><span className="permission-step">1</span><strong>Choisissez la date</strong><small>10 h → 17 h est proposé automatiquement.</small></div><div><span className="permission-step">2</span><strong>Envoyez</strong><small>Le médecin et le cadre sont notifiés.</small></div><div><span className="permission-step">3</span><strong>Suivez la couleur</strong><small>Orange = en attente · Vert = validée.</small></div></section>
      <section className="card" style={{ marginBottom: 18 }}><div className="card-header"><div><h2>Nouvelle permission</h2><p className="card-subtitle">La demande se fait en quelques clics.</p></div></div><div className="card-body"><PermissionForm minNoticeHours={minNoticeHours} /></div></section>
      <section className="card" style={{ marginBottom: 18 }}><div className="card-header"><div><h2>Calendrier de mes permissions</h2><p className="card-subtitle">Les refus ne sont pas affichés ici pour garder une vue simple.</p></div><div className="permission-legend"><span><i className="permission-dot permission-dot--approved" />Validée</span><span><i className="permission-dot permission-dot--waiting" />En attente</span></div></div><div className="card-body permission-months">{months.map(({ year, month }) => {
        const days = monthCalendar(year, month);
        return <div className="permission-month" key={`${year}-${month}`}><h3>{monthLabel(year, month)}</h3><div className="permission-weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="permission-calendar">{days.map((day, index) => {
          if (!day) return <span className="permission-day permission-day--empty" key={`e-${index}`} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const events = visibleCalendar.filter((item) => localDateKey(item.departure_at, profile.facility.timezone) === key);
          const approved = events.some((item) => ["approved", "departed", "returned"].includes(item.status));
          const waiting = events.some((item) => ["submitted", "waiting"].includes(item.status));
          return <div className={`permission-day${approved ? " permission-day--approved" : waiting ? " permission-day--waiting" : ""}`} key={key}><strong>{day}</strong>{events.slice(0, 2).map((item) => <small key={item.id}>{new Intl.DateTimeFormat(profile.facility.locale || "fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: profile.facility.timezone }).format(new Date(item.departure_at))}</small>)}</div>;
        })}</div></div>;
      })}</div></section>
    </>}
    <section className="card"><div className="card-header"><div><h2>{profile.role === "patient" ? "Mes demandes" : "Liste des permissions"}</h2><p className="card-subtitle">Historique et état actuel.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr>{profile.role !== "patient" && <th>Patient</th>}<th>Départ prévu</th><th>Retour prévu</th><th>Statut</th>{profile.role !== "patient" && <><th>Médecin</th><th>Cadre</th></>}<th>Action</th></tr></thead><tbody>{permissions?.length ? permissions.map((item) => {
      const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient;
      const canReview = (profile.role === "doctor" && !item.doctor_decision) || (profile.role === "manager" && !item.manager_decision);
      const receptionAction = profile.role === "reception" && (item.status === "approved" || item.status === "departed") ? (item.status === "approved" ? "depart" : "return") : null;
      return <tr key={item.id}>{profile.role !== "patient" && <td><strong>{patient?.full_name || "Patient"}</strong></td>}<td>{displayDateTime(item.departure_at)}</td><td>{displayDateTime(item.return_at)}</td><td><StatusBadge status={item.status as PermissionStatus} /></td>{profile.role !== "patient" && <><td><DecisionText value={item.doctor_decision} /></td><td><DecisionText value={item.manager_decision} /></td></>}<td>{canReview ? <PermissionDecisionActions permissionId={item.id} /> : receptionAction ? <MovementActions permissionId={item.id} action={receptionAction} /> : <span className="row-meta">{item.returned_at ? "Clôturée" : item.departed_at ? "Patient sorti" : "Aucune action"}</span>}</td></tr>;
    }) : <tr><td colSpan={profile.role === "patient" ? 4 : 7} className="empty">Aucune permission à afficher.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
