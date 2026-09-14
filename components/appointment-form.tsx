"use client";

import { useState, type FormEvent } from "react";
import { createAppointment } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function AppointmentForm({ patients, initialPatientId = null }: { patients: { id: string; full_name: string }[]; initialPatientId?: string | null }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({}); const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult({}); const form = new FormData(event.currentTarget);
    const reply = await createAppointment({ patientId: String(form.get("patientId")), title: String(form.get("title")), startsAt: String(form.get("startsAt")), endsAt: String(form.get("endsAt")), location: String(form.get("location")), notes: String(form.get("notes")) });
    setResult(reply); setLoading(false); if (reply.success) event.currentTarget.reset();
  }
  return <form onSubmit={onSubmit}><ActionFeedback message={result.success} error={result.error} /><div className="form-grid"><label className="field">Patient<select name="patientId" defaultValue={initialPatientId || ""} required><option value="" disabled>Choisir un patient</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.full_name}</option>)}</select></label><label className="field">Intitulé<input name="title" required placeholder="Ex. entretien individuel" /></label><label className="field">Début<input name="startsAt" type="datetime-local" required /></label><label className="field">Fin<input name="endsAt" type="datetime-local" required /></label><label className="field">Lieu<input name="location" placeholder="Salle ou unité" /></label><label className="field">Notes (facultatif)<input name="notes" placeholder="Information visible au patient" /></label></div><button className="button button-primary" disabled={loading}>{loading ? "Ajout..." : "Ajouter au planning"}</button></form>;
}
