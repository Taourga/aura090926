"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createCalendarPermission } from "@/app/portal/permission-actions";
import { ActionFeedback } from "@/components/action-feedback";

type Preset = "half" | "day" | "overnight";

function pad(value: number) { return String(value).padStart(2, "0"); }
function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextAllowedAt(hour: number, minNoticeHours: number) {
  const earliest = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000 + 60 * 60 * 1000);
  const candidate = new Date(earliest);
  candidate.setHours(hour, 0, 0, 0);
  if (candidate < earliest) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

function presetWindow(preset: Preset, minNoticeHours: number) {
  if (preset === "half") {
    const departure = nextAllowedAt(13, minNoticeHours);
    const returned = new Date(departure);
    returned.setHours(18, 0, 0, 0);
    return { departure, returned };
  }
  if (preset === "overnight") {
    const departure = nextAllowedAt(14, minNoticeHours);
    const returned = new Date(departure);
    returned.setDate(returned.getDate() + 1);
    returned.setHours(10, 0, 0, 0);
    return { departure, returned };
  }
  const departure = nextAllowedAt(10, minNoticeHours);
  const returned = new Date(departure);
  returned.setHours(18, 0, 0, 0);
  return { departure, returned };
}

export function PatientPermissionQuickAdd({ minNoticeHours = 48 }: { minNoticeHours?: number }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("day");
  const initial = presetWindow("day", minNoticeHours);
  const [departureAt, setDepartureAt] = useState(toLocalInput(initial.departure));
  const [returnAt, setReturnAt] = useState(toLocalInput(initial.returned));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});

  function choose(nextPreset: Preset) {
    const window = presetWindow(nextPreset, minNoticeHours);
    setPreset(nextPreset);
    setDepartureAt(toLocalInput(window.departure));
    setReturnAt(toLocalInput(window.returned));
    setResult({});
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult({});
    const reply = await createCalendarPermission({ departureAt, returnAt, reason });
    setResult(reply);
    setLoading(false);
    if (reply.success) {
      setReason("");
      setTimeout(() => setOpen(false), 850);
    }
  }

  return <section className="card patient-permission-quick-add">
    <div className="card-header patient-permission-quick-head">
      <div>
        <span className="section-kicker">Sortie temporaire</span>
        <h2>Demander une permission</h2>
        <p className="card-subtitle">Choisissez un format puis ajustez les horaires si besoin.</p>
      </div>
      <Link className="button button-secondary button-small" href="/portal/permissions">Voir mes demandes</Link>
    </div>
    <div className="card-body">
      <div className="patient-permission-presets" role="group" aria-label="Formats de permission">
        <button type="button" className={preset === "half" && open ? "button button-primary button-small" : "button button-secondary button-small"} onClick={() => choose("half")}>◷ Demi-journée</button>
        <button type="button" className={preset === "day" && open ? "button button-primary button-small" : "button button-secondary button-small"} onClick={() => choose("day")}>☀ Journée</button>
        <button type="button" className={preset === "overnight" && open ? "button button-primary button-small" : "button button-secondary button-small"} onClick={() => choose("overnight")}>☾ Avec une nuit</button>
      </div>

      {open && <form onSubmit={submit} className="patient-permission-inline-form">
        <ActionFeedback message={result.success} error={result.error} />
        <div className="form-grid">
          <label className="field">Départ<input type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} required /></label>
          <label className="field">Retour<input type="datetime-local" value={returnAt} onChange={(event) => setReturnAt(event.target.value)} required /></label>
          <label className="field wide">Motif <span className="field-optional">(facultatif)</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. sortie familiale" /></label>
        </div>
        <div className="patient-permission-inline-actions">
          <button className="button button-primary" disabled={loading}>{loading ? "Envoi…" : "Envoyer ma demande"}</button>
          <button type="button" className="button button-secondary" onClick={() => { setOpen(false); setResult({}); }} disabled={loading}>Fermer</button>
          <small>Préavis minimum : {minNoticeHours} h · maximum 24 h.</small>
        </div>
      </form>}
    </div>
  </section>;
}
