"use client";

import { useState, type FormEvent } from "react";
import { createExternalAppointment, scheduleDoctorRound } from "@/app/portal/actions";
import { publishDoctorAbsence } from "@/app/portal/care-actions";
import { ActionFeedback } from "@/components/action-feedback";

export function DoctorRoundForm() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult({});
    const form = new FormData(event.currentTarget);
    const reply = await scheduleDoctorRound({ floorNumber: Number(form.get("floorNumber")), scheduledAt: String(form.get("scheduledAt")) });
    setResult(reply); setLoading(false); if (reply.success) event.currentTarget.reset();
  }
  return <form className="compact-form" onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <label className="field">Étage<select name="floorNumber" defaultValue="" required><option value="" disabled>Choisir l&apos;étage</option><option value="0">RDC</option><option value="1">1er étage</option><option value="2">2e étage</option><option value="3">3e étage</option></select></label>
    <label className="field">Heure de passage<input name="scheduledAt" type="datetime-local" required /></label>
    <button className="button button-primary" disabled={loading}>{loading ? "Publication..." : "Publier le passage"}</button>
  </form>;
}

export function ExternalAppointmentForm() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult({});
    const form = new FormData(event.currentTarget);
    const reply = await createExternalAppointment({ startsAt: String(form.get("startsAt")), endsAt: String(form.get("endsAt")) });
    setResult(reply); setLoading(false); if (reply.success) event.currentTarget.reset();
  }
  return <form className="compact-form compact-form--external" onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <label className="field">Début<input name="startsAt" type="datetime-local" required /></label>
    <label className="field">Fin<input name="endsAt" type="datetime-local" required /></label>
    <button className="button button-secondary" disabled={loading}>{loading ? "Ajout..." : "Bloquer ce créneau"}</button>
  </form>;
}

export function DoctorAbsenceForm({ doctors }: { doctors: { id: string; full_name: string }[] }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setResult({});
    const form = new FormData(event.currentTarget);
    const reply = await publishDoctorAbsence({ startsAt: String(form.get("startsAt")), endsAt: String(form.get("endsAt")), reason: String(form.get("reason") || ""), replacementDoctorId: String(form.get("replacementDoctorId") || "") || undefined });
    setResult(reply); setLoading(false); if (reply.success) event.currentTarget.reset();
  }
  return <form className="compact-form" onSubmit={onSubmit}>
    <ActionFeedback message={result.success} error={result.error} />
    <div className="form-grid"><label className="field">Début<input name="startsAt" type="datetime-local" required /></label><label className="field">Fin<input name="endsAt" type="datetime-local" required /></label></div>
    <label className="field">Motif<input name="reason" placeholder="Ex. congés planifiés" /></label>
    <label className="field">Médecin remplaçant<select name="replacementDoctorId" defaultValue=""><option value="">À définir</option>{doctors.map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.full_name}</option>)}</select></label>
    <button className="button button-secondary" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer mon absence"}</button>
  </form>;
}
