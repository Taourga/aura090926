"use client";

import { useMemo, useState, type FormEvent } from "react";
import { submitPermission } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDefaults(minNoticeHours: number) {
  const minimum = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000);
  const departure = new Date(minimum);
  departure.setMinutes(0, 0, 0);
  departure.setHours(10);
  if (departure.getTime() < minimum.getTime()) {
    departure.setDate(departure.getDate() + 1);
    departure.setHours(10, 0, 0, 0);
  }
  const returned = new Date(departure);
  returned.setHours(17, 0, 0, 0);
  return {
    minDeparture: toLocalInputValue(minimum),
    departureAt: toLocalInputValue(departure),
    returnAt: toLocalInputValue(returned),
  };
}

export function PermissionForm({ minNoticeHours, compact = false }: { minNoticeHours: number; compact?: boolean }) {
  const defaults = useMemo(() => buildDefaults(minNoticeHours), [minNoticeHours]);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  const [departureAt, setDepartureAt] = useState(defaults.departureAt);
  const [returnAt, setReturnAt] = useState(defaults.returnAt);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult({});
    const form = new FormData(event.currentTarget);
    const response = await submitPermission({
      departureAt: String(form.get("departureAt")),
      returnAt: String(form.get("returnAt")),
      reason: String(form.get("reason")),
    });
    setResult(response);
    setLoading(false);
    if (response.success) {
      const next = buildDefaults(minNoticeHours);
      setDepartureAt(next.departureAt);
      setReturnAt(next.returnAt);
      event.currentTarget.reset();
    }
  }

  function onDepartureChange(value: string) {
    setDepartureAt(value);
    const nextDeparture = new Date(value);
    if (!Number.isNaN(nextDeparture.getTime())) {
      const suggestedReturn = new Date(nextDeparture);
      suggestedReturn.setHours(17, 0, 0, 0);
      if (suggestedReturn <= nextDeparture) suggestedReturn.setTime(nextDeparture.getTime() + 2 * 60 * 60 * 1000);
      setReturnAt(toLocalInputValue(suggestedReturn));
    }
  }

  return <form onSubmit={onSubmit} className={compact ? "permission-quick-form" : ""}>
    <ActionFeedback message={result.success} error={result.error} />
    <div className={compact ? "permission-quick-grid" : "form-grid"}>
      <label className="field">Je sors le<input name="departureAt" type="datetime-local" min={defaults.minDeparture} value={departureAt} onChange={(event) => onDepartureChange(event.target.value)} required /></label>
      <label className="field">Je reviens le<input name="returnAt" type="datetime-local" min={departureAt} value={returnAt} onChange={(event) => setReturnAt(event.target.value)} required /></label>
      <label className={compact ? "field permission-reason" : "field wide"}>Motif <span className="field-optional">(facultatif)</span><input name="reason" placeholder="Ex. sortie familiale" /></label>
    </div>
    {!compact && <p className="form-help">Les horaires sont préremplis à 10 h → 17 h et restent modifiables. La demande doit être envoyée au moins {minNoticeHours} heures avant le départ.</p>}
    <button className="button button-primary" disabled={loading}>{loading ? "Envoi…" : compact ? "Demander cette permission" : "Envoyer ma demande"}</button>
  </form>;
}
