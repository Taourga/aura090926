"use client";

import { useEffect, useState, type FormEvent } from "react";
import { submitVisit } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

function addMinutes(value: string, minutes: number) {
  const date = new Date(value); date.setMinutes(date.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function VisitForm({ startTime, endTime, maxDurationMinutes, maxVisitors, maxPerDay, initialDate }: { startTime: string; endTime: string; maxDurationMinutes: number; maxVisitors: number; maxPerDay: number; initialDate?: string }) {
  const defaultStart = initialDate ? `${initialDate}T${startTime}` : "";
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [endsAt, setEndsAt] = useState(defaultStart ? addMinutes(defaultStart, Math.min(maxDurationMinutes, 60)) : "");
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => { const next = initialDate ? `${initialDate}T${startTime}` : ""; setStartsAt(next); setEndsAt(next ? addMinutes(next, Math.min(maxDurationMinutes, 60)) : ""); setResult({}); }, [initialDate, startTime, maxDurationMinutes]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget);
    const reply = await submitVisit({ startsAt, endsAt, visitorOneName: String(form.get("visitorOneName")), visitorTwoName: String(form.get("visitorTwoName") || "") });
    setResult(reply); setLoading(false);
    if (reply.success) { event.currentTarget.reset(); setStartsAt(defaultStart); setEndsAt(defaultStart ? addMinutes(defaultStart, Math.min(maxDurationMinutes,60)) : ""); }
  }
  return <form onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <div className="form-grid">
      <label className="field">Début<input name="startsAt" type="datetime-local" value={startsAt} onChange={(e)=>{setStartsAt(e.target.value); setEndsAt(addMinutes(e.target.value,Math.min(maxDurationMinutes,60)));}} required /></label>
      <label className="field">Fin<input name="endsAt" type="datetime-local" value={endsAt} onChange={(e)=>setEndsAt(e.target.value)} required /></label>
      <label className="field">Visiteur 1<input name="visitorOneName" placeholder="Nom et prénom" required /></label>
      {maxVisitors > 1 && <label className="field">Visiteur 2 <span className="field-optional">(facultatif)</span><input name="visitorTwoName" placeholder="Nom et prénom" /></label>}
    </div>
    <p className="form-help">{maxVisitors} visiteur{maxVisitors > 1 ? "s" : ""} max · {maxDurationMinutes} min max · entre {startTime} et {endTime} · {maxPerDay} visite{maxPerDay > 1 ? "s" : ""}/jour.</p>
    <button className="button button-primary" disabled={loading}>{loading ? "Envoi…" : "Prévenir l’accueil"}</button>
  </form>;
}
