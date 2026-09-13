"use client";

import { useMemo, useState, type FormEvent } from "react";
import { cancelCalendarPermission, createCalendarPermission, updateCalendarPermission } from "@/app/portal/permission-actions";
import { ActionFeedback } from "@/components/action-feedback";

type PermissionItem = {
  id: string;
  departure_at: string;
  return_at: string;
  reason: string | null;
  status: string;
};

type Props = {
  permissions: PermissionItem[];
  locale: string;
  timezone: string;
  minNoticeHours: number;
};

function pad(value: number) { return String(value).padStart(2, "0"); }
function localDateKey(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
function monthCalendar(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: mondayOffset + count }, (_, index) => index < mondayOffset ? null : index - mondayOffset + 1);
}
function toLocalInput(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function dateAt(key: string, hour: number) { return new Date(`${key}T${pad(hour)}:00:00`); }
function statusLabel(status: string) {
  if (["approved","departed","returned"].includes(status)) return "Validée";
  if (["submitted","waiting"].includes(status)) return "En attente";
  if (status === "cancelled") return "Annulée";
  return status;
}

export function PermissionCalendar({ permissions, locale, timezone, minNoticeHours }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<PermissionItem | null>(null);
  const [departureAt, setDepartureAt] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [reason, setReason] = useState("");
  const [overnight, setOvernight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});

  const visible = useMemo(() => permissions.filter((item) => ["submitted","waiting","approved","departed","returned"].includes(item.status)), [permissions]);
  const now = new Date();
  const months = [{ year: now.getFullYear(), month: now.getMonth() }, { year: now.getMonth() === 11 ? now.getFullYear()+1 : now.getFullYear(), month: (now.getMonth()+1)%12 }];
  const earliest = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000);
  const monthLabel = (year: number, month: number) => new Intl.DateTimeFormat(locale || "fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  const displayDateTime = (value: string) => new Intl.DateTimeFormat(locale || "fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", timeZone: timezone }).format(new Date(value));

  function permissionDates(item: PermissionItem) {
    const start = localDateKey(item.departure_at, timezone);
    const end = localDateKey(item.return_at, timezone);
    return start === end ? [start] : [start, end];
  }
  function eventsFor(key: string) { return visible.filter((item) => permissionDates(item).includes(key)); }

  function openNew(key: string) {
    setSelectedPermission(null); setSelectedDate(key); setResult({}); setReason(""); setOvernight(false);
    const departure = dateAt(key, 10); const returned = dateAt(key, 17);
    setDepartureAt(toLocalInput(departure)); setReturnAt(toLocalInput(returned));
  }
  function openExisting(item: PermissionItem) {
    setSelectedPermission(item); setSelectedDate(localDateKey(item.departure_at, timezone)); setResult({}); setReason(item.reason || "");
    const departure = new Date(item.departure_at); const returned = new Date(item.return_at);
    setDepartureAt(toLocalInput(departure)); setReturnAt(toLocalInput(returned));
    setOvernight(localDateKey(item.departure_at, timezone) !== localDateKey(item.return_at, timezone));
  }
  function close() { setSelectedDate(null); setSelectedPermission(null); setResult({}); }

  function toggleOvernight(value: boolean) {
    setOvernight(value);
    if (!departureAt) return;
    const departure = new Date(departureAt);
    const returned = new Date(departure);
    if (value) { returned.setDate(returned.getDate()+1); returned.setHours(10,0,0,0); }
    else { returned.setHours(17,0,0,0); if (returned <= departure) returned.setTime(departure.getTime()+2*60*60*1000); }
    setReturnAt(toLocalInput(returned));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult({});
    const reply = selectedPermission
      ? await updateCalendarPermission({ permissionId: selectedPermission.id, departureAt, returnAt, reason })
      : await createCalendarPermission({ departureAt, returnAt, reason });
    setResult(reply); setLoading(false);
    if (reply.success) setTimeout(close, 650);
  }
  async function cancelPermission() {
    if (!selectedPermission || !window.confirm("Annuler cette permission ?")) return;
    setLoading(true); setResult({});
    const reply = await cancelCalendarPermission(selectedPermission.id);
    setResult(reply); setLoading(false);
    if (reply.success) setTimeout(close, 650);
  }

  const editable = selectedPermission ? ["submitted","waiting"].includes(selectedPermission.status) && new Date(selectedPermission.departure_at) > new Date() : true;
  const cancellable = selectedPermission ? ["submitted","waiting","approved"].includes(selectedPermission.status) && new Date(selectedPermission.departure_at) > new Date() : false;

  return <>
    <section className="card permission-calendar-card"><div className="card-header"><div><h2>Calendrier de mes permissions</h2><p className="card-subtitle">Cliquez sur un jour pour créer, consulter, modifier ou annuler. Une permission peut durer jusqu’à 24 h, avec une seule nuit.</p></div><div className="permission-legend"><span><i className="permission-dot permission-dot--approved" />Validée</span><span><i className="permission-dot permission-dot--waiting" />En attente</span></div></div>
      <div className="card-body permission-months">{months.map(({ year, month }) => <div className="permission-month" key={`${year}-${month}`}><h3>{monthLabel(year,month)}</h3><div className="permission-weekdays">{["L","M","M","J","V","S","D"].map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div><div className="permission-calendar">{monthCalendar(year,month).map((day,index)=>{
        if (!day) return <span className="permission-day permission-day--empty" key={`e-${index}`} />;
        const key = `${year}-${pad(month+1)}-${pad(day)}`; const events = eventsFor(key);
        const approved = events.some((item)=>["approved","departed","returned"].includes(item.status)); const waiting = events.some((item)=>["submitted","waiting"].includes(item.status));
        const date = dateAt(key,10); const tooEarly = date.getTime() < earliest.getTime() && events.length===0;
        return <button type="button" className={`permission-day permission-day--button${approved?" permission-day--approved":waiting?" permission-day--waiting":""}${tooEarly?" permission-day--disabled":""}`} key={key} onClick={()=> events.length ? openExisting(events[0]) : !tooEarly && openNew(key)} disabled={tooEarly}>
          <strong>{day}</strong>{events.slice(0,2).map((item)=><small key={item.id}>{statusLabel(item.status)}{permissionDates(item).length>1 ? " · 24 h" : ""}</small>)}{!events.length && !tooEarly && <small className="permission-day-hint">+ demander</small>}
        </button>;
      })}</div></div>)}</div>
    </section>

    {selectedDate && <div className="permission-modal-backdrop" role="presentation" onMouseDown={(event)=>{ if(event.currentTarget===event.target) close(); }}><section className="permission-modal" role="dialog" aria-modal="true" aria-label="Permission"><div className="permission-modal-head"><div><span className="section-kicker">{selectedPermission ? "Ma permission" : "Nouvelle permission"}</span><h2>{selectedPermission ? statusLabel(selectedPermission.status) : `Demande du ${new Intl.DateTimeFormat(locale || "fr-FR", { day:"numeric", month:"long" }).format(new Date(`${selectedDate}T12:00:00`))}`}</h2></div><button type="button" className="permission-modal-close" onClick={close} aria-label="Fermer">×</button></div>
      <ActionFeedback message={result.success} error={result.error} />
      {selectedPermission && !editable ? <div className="permission-summary"><strong>{displayDateTime(selectedPermission.departure_at)} → {displayDateTime(selectedPermission.return_at)}</strong><p>{selectedPermission.reason || "Aucun motif renseigné."}</p>{selectedPermission.status === "approved" && <p className="form-help">Cette permission est validée. Pour changer les horaires, annulez-la puis créez une nouvelle demande.</p>}</div> : <form onSubmit={submit}><div className="permission-modal-choice"><label><input type="radio" name="durationMode" checked={!overnight} onChange={()=>toggleOvernight(false)} /> Dans la journée</label><label><input type="radio" name="durationMode" checked={overnight} onChange={()=>toggleOvernight(true)} /> Avec une nuit</label></div><div className="form-grid"><label className="field">Départ<input type="datetime-local" value={departureAt} onChange={(e)=>setDepartureAt(e.target.value)} required /></label><label className="field">Retour<input type="datetime-local" value={returnAt} onChange={(e)=>setReturnAt(e.target.value)} required /></label><label className="field wide">Motif <span className="field-optional">(facultatif)</span><input value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Ex. sortie familiale" /></label></div><p className="form-help">Maximum 24 heures. Une seule nuit est possible. Les horaires restent modifiables.</p><button className="button button-primary" disabled={loading}>{loading ? "Enregistrement…" : selectedPermission ? "Enregistrer les modifications" : "Envoyer ma demande"}</button></form>}
      {cancellable && <div className="permission-modal-danger"><button type="button" className="button button-secondary" onClick={cancelPermission} disabled={loading}>Annuler cette permission</button></div>}
    </section></div>}
  </>;
}
