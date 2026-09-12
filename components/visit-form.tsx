"use client";

import { useState, type FormEvent } from "react";
import { submitVisit } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function VisitForm({ startTime, endTime, maxDurationMinutes, maxVisitors, maxPerDay }: { startTime: string; endTime: string; maxDurationMinutes: number; maxVisitors: number; maxPerDay: number }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const reply = await submitVisit({ startsAt: String(form.get("startsAt")), endsAt: String(form.get("endsAt")), visitorOneName: String(form.get("visitorOneName")), visitorTwoName: String(form.get("visitorTwoName") || "") });
    setResult(reply); setLoading(false);
    if (reply.success) event.currentTarget.reset();
  }
  return <form onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <div className="form-grid">
      <label className="field">Début de visite<input name="startsAt" type="datetime-local" required /></label>
      <label className="field">Fin de visite<input name="endsAt" type="datetime-local" required /></label>
      <label className="field">Visiteur 1<input name="visitorOneName" placeholder="Nom et prénom" required /></label>
      {maxVisitors > 1 && <label className="field">Visiteur 2 <span className="field-optional">(facultatif)</span><input name="visitorTwoName" placeholder="Nom et prénom" /></label>}
    </div>
    <p className="form-help">{maxVisitors} visiteur{maxVisitors > 1 ? "s" : ""} maximum · {maxDurationMinutes} min maximum · entre {startTime} et {endTime} · {maxPerDay} visite{maxPerDay > 1 ? "s" : ""} par jour.</p>
    <button className="button button-primary" disabled={loading}>{loading ? "Envoi..." : "Prévenir l’accueil"}</button>
  </form>;
}
