"use client";

import { useState, type FormEvent } from "react";
import { submitPermission } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function PermissionForm() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult({});
    const form = new FormData(event.currentTarget);
    const response = await submitPermission({ departureAt: String(form.get("departureAt")), returnAt: String(form.get("returnAt")), reason: String(form.get("reason")) });
    setResult(response); setLoading(false);
    if (response.success) event.currentTarget.reset();
  }
  const minDeparture = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return <form onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <div className="form-grid">
      <label className="field">Début de la permission<input name="departureAt" type="datetime-local" min={minDeparture} required /></label>
      <label className="field">Fin de la permission<input name="returnAt" type="datetime-local" required /></label>
      <label className="field wide">Motif ou commentaire (facultatif)<textarea name="reason" placeholder="Ex. rendez-vous familial" /></label>
    </div>
    <p className="form-help">Une demande doit être envoyée au moins 48 heures avant le début souhaité de la permission.</p>
    <button className="button button-primary" disabled={loading}>{loading ? "Envoi..." : "Envoyer ma demande"}</button>
  </form>;
}
