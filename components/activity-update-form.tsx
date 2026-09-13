"use client";

import { useState, type FormEvent } from "react";
import { publishActivityUpdate } from "@/app/portal/care-actions";
import { ActionFeedback } from "@/components/action-feedback";

export function ActivityUpdateForm({ activityId }: { activityId: string }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult({});
    const form = new FormData(event.currentTarget);
    const response = await publishActivityUpdate(activityId, String(form.get("type")) as "absence" | "change" | "information", String(form.get("message")));
    setResult(response); setLoading(false); if (response.success) event.currentTarget.reset();
  }
  return <form className="compact-form" onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <label className="field">Type
      <select name="type" defaultValue="change"><option value="change">Modification</option><option value="absence">Absence de l’intervenant</option><option value="information">Information</option></select>
    </label>
    <label className="field">Message aux inscrits<textarea name="message" required maxLength={500} placeholder="Ex. activité décalée à 15 h, rendez-vous devant la salle 10 minutes avant." /></label>
    <button className="button button-primary button-small" disabled={loading}>{loading ? "Publication…" : "Publier l’alerte"}</button>
  </form>;
}
