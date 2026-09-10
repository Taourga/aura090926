"use client";

import { useState, type FormEvent } from "react";
import { updateSportRoomSchedule } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function SportRoomScheduleForm() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const reply = await updateSportRoomSchedule({
      scheduleDate: String(form.get("scheduleDate")),
      opensAt: String(form.get("opensAt")),
      closesAt: String(form.get("closesAt")),
      note: String(form.get("note")),
    });
    setResult(reply);
    setLoading(false);
  }

  return <form onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <div className="form-grid">
      <label className="field">Jour<input name="scheduleDate" type="date" required /></label>
      <label className="field">Ouverture<input name="opensAt" type="time" defaultValue="09:00" required /></label>
      <label className="field">Fermeture<input name="closesAt" type="time" defaultValue="12:00" required /></label>
      <label className="field wide">Information facultative<textarea name="note" placeholder="Ex. créneau réservé à un atelier de groupe de 10 h à 11 h." /></label>
    </div>
    <button className="button button-primary" disabled={loading}>{loading ? "Enregistrement..." : "Mettre à jour le créneau"}</button>
  </form>;
}
