"use client";

import { useState, type FormEvent } from "react";
import { addMenuItem, publishInformation } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function InformationEditor() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({}); const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); const form = new FormData(event.currentTarget); const reply = await publishInformation({ title: String(form.get("title")), body: String(form.get("body")), startsAt: String(form.get("startsAt")), endsAt: String(form.get("endsAt")) }); setResult(reply); setLoading(false); if (reply.success) event.currentTarget.reset(); }
  return <form onSubmit={onSubmit}><ActionFeedback message={result.success} error={result.error} /><div className="form-grid"><label className="field">Titre<input name="title" required placeholder="Ex. Changement de draps" /></label><label className="field">Période de début (facultatif)<input name="startsAt" type="datetime-local" /></label><label className="field wide">Information<textarea name="body" required placeholder="Rédigez une information claire pour les patients." /></label><label className="field">Fin d&apos;affichage (facultatif)<input name="endsAt" type="datetime-local" /></label></div><button className="button button-primary" disabled={loading}>{loading ? "Publication..." : "Publier l’information"}</button></form>;
}

export function MenuEditor() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({}); const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); const form = new FormData(event.currentTarget); const reply = await addMenuItem({ serviceDate: String(form.get("serviceDate")), meal: String(form.get("meal")), description: String(form.get("description")) }); setResult(reply); setLoading(false); if (reply.success) event.currentTarget.reset(); }
  return <form onSubmit={onSubmit}><ActionFeedback message={result.success} error={result.error} /><div className="form-grid"><label className="field">Date<input name="serviceDate" type="date" required /></label><label className="field">Repas<select name="meal" defaultValue="lunch"><option value="breakfast">Petit-déjeuner</option><option value="lunch">Déjeuner</option><option value="dinner">Dîner</option></select></label><label className="field wide">Menu<textarea name="description" required placeholder="Entrée, plat, accompagnement, dessert..." /></label></div><button className="button button-primary" disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer le menu"}</button></form>;
}
