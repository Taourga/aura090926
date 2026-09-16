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

const presetMeta: Record<Preset, { icon: string; label: string; detail: string }> = {
  half: { icon: "◐", label: "Demi-journée", detail: "Quelques heures" },
  day: { icon: "☀", label: "Journée", detail: "Toute la journée" },
  overnight: { icon: "☾", label: "Avec une nuit", detail: "Retour le lendemain" },
};

export function PatientPermissionQuickAdd({ minNoticeHours = 48 }: { minNoticeHours?: number }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("half");
  const initial = presetWindow("half", minNoticeHours);
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
  }

  function startRequest() {
    const window = presetWindow(preset, minNoticeHours);
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
      setTimeout(() => setOpen(false), 900);
    }
  }

  return <section className="patient-permission-premium" aria-label="Demander une permission">
    <div className="patient-permission-topline">
      <div className="patient-permission-title-wrap">
        <span className="patient-permission-symbol" aria-hidden="true">↗</span>
        <div>
          <span className="section-kicker">Sortie temporaire</span>
          <h2>Demander une permission</h2>
          <p>Choisissez un format puis envoyez votre demande en quelques secondes.</p>
        </div>
      </div>
      <div className="patient-permission-visual" aria-hidden="true">
        <span className="patient-permission-sun" />
        <span className="patient-permission-hill patient-permission-hill--one" />
        <span className="patient-permission-hill patient-permission-hill--two" />
        <small>Un peu de liberté,<br />pour mieux avancer.</small>
      </div>
    </div>

    <div className="patient-permission-mainrow">
      <div className="patient-permission-options" role="radiogroup" aria-label="Format de permission">
        {(Object.keys(presetMeta) as Preset[]).map((key) => {
          const meta = presetMeta[key];
          const selected = preset === key;
          return <button
            type="button"
            key={key}
            role="radio"
            aria-checked={selected}
            className={`patient-permission-option${selected ? " is-selected" : ""}`}
            onClick={() => choose(key)}
          >
            <span className="patient-permission-check" aria-hidden="true">{selected ? "✓" : meta.icon}</span>
            <span className="patient-permission-option-copy"><strong>{meta.label}</strong><small>{meta.detail}</small></span>
          </button>;
        })}
      </div>

      <div className="patient-permission-actions">
        <button type="button" className="patient-permission-cta" onClick={startRequest}>↗ Faire ma demande</button>
        <Link className="patient-permission-secondary" href="/portal/permissions">☷ Voir mes demandes</Link>
      </div>
    </div>

    {open && <form onSubmit={submit} className="patient-permission-inline-form patient-permission-inline-form--premium">
      <div className="patient-permission-form-head">
        <div><span className="section-kicker">{presetMeta[preset].label}</span><strong>Derniers détails</strong></div>
        <button type="button" className="patient-permission-close" onClick={() => { setOpen(false); setResult({}); }} aria-label="Fermer">×</button>
      </div>
      <ActionFeedback message={result.success} error={result.error} />
      <div className="form-grid patient-permission-form-grid">
        <label className="field">Départ<input type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} required /></label>
        <label className="field">Retour<input type="datetime-local" value={returnAt} onChange={(event) => setReturnAt(event.target.value)} required /></label>
        <label className="field wide">Motif <span className="field-optional">(facultatif)</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. sortie familiale" /></label>
      </div>
      <div className="patient-permission-inline-actions">
        <button className="button button-primary" disabled={loading}>{loading ? "Envoi…" : "Envoyer ma demande"}</button>
        <small>Préavis minimum : {minNoticeHours} h · maximum 24 h.</small>
      </div>
    </form>}
  </section>;
}
