"use client";

import { useState, type FormEvent } from "react";
import { createActivity } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function ActivityForm() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const reply = await createActivity({
      title: String(form.get("title")), description: String(form.get("description")), startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")), location: String(form.get("location")), capacity: Number(form.get("capacity")),
    });
    setResult(reply);
    setLoading(false);
    if (reply.success) event.currentTarget.reset();
  }

  return <form onSubmit={onSubmit}><ActionFeedback message={result.success} error={result.error} /><div className="form-grid"><label className="field wide">Nom de l’activité<input name="title" required placeholder="Ex. relaxation guidée" /></label><label className="field">Début<input name="startsAt" type="datetime-local" required /></label><label className="field">Fin<input name="endsAt" type="datetime-local" required /></label><label className="field">Lieu<input name="location" placeholder="Ex. salle bien-être" /></label><label className="field">Places<input name="capacity" type="number" min="1" defaultValue="12" required /></label><label className="field wide">Description (facultative)<textarea name="description" placeholder="Information utile aux patients." /></label></div><button className="button button-primary" disabled={loading}>{loading ? "Publication..." : "Publier l’activité"}</button></form>;
}
