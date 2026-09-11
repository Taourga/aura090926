"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAdmission, admissionAction, dischargeAction } from "@/app/portal/stays/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { parisInput, roomNumbers } from "@/lib/housekeeping";

function useAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const router = useRouter();
  function run(action: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => { try { const response = await action(); setResult(response); if (!response.error) router.refresh(); } catch { setResult({ error: "L’opération n’a pas pu être confirmée. Actualisez puis réessayez." }); } });
  }
  return { pending, run, feedback: <ActionFeedback error={result.error} message={result.success} /> };
}
export function AdmissionForm({ patients }: { patients: { id: string; full_name: string }[] }) {
  const { pending, run, feedback } = useAction();
  return <form className="form" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); run(() => createAdmission(String(form.get("patient")), String(form.get("room")), String(form.get("expected")))); }}>
    <label className="field">Patient<select name="patient" required><option value="">Choisir un patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
    <label className="field">Chambre<select name="room" required>{roomNumbers.map(r => <option key={r}>{r}</option>)}</select></label>
    <label className="field">Première entrée prévue · heure de Paris<input name="expected" type="datetime-local" required /></label>
    <button disabled={pending || !patients.length} className="button button-primary">{pending ? "Enregistrement…" : "Prévoir l’admission"}</button>{feedback}
  </form>;
}
export function AdmissionActions({ id }: { id: string }) {
  const { pending, run, feedback } = useAction();
  return <div><div className="cleaning-actions"><button className="button button-primary button-small" disabled={pending} onClick={() => run(() => admissionAction(id, "arrive"))}>Confirmer l’entrée réelle</button><button className="button button-secondary button-small" disabled={pending} onClick={() => run(() => admissionAction(id, "cancel"))}>Annuler la prévision</button></div>{feedback}</div>;
}
export function DischargeForm({ id, expected }: { id: string; expected: string | null }) {
  const { pending, run, feedback } = useAction();
  const [value, setValue] = useState(parisInput(expected));
  const [confirming, setConfirming] = useState(false);
  return <div><form className="cleaning-actions" onSubmit={e => { e.preventDefault(); run(() => dischargeAction(id, value, false)); }}><input type="datetime-local" aria-label="Sortie définitive prévue, heure de Paris" value={value} onChange={e => setValue(e.target.value)} /><button className="button button-secondary button-small" disabled={pending}>Enregistrer la prévision</button></form><small>Vider la date puis enregistrer pour retirer la prévision.</small>
    {confirming ? <div className="cleaning-actions"><span>Le patient quitte définitivement la clinique maintenant ?</span><button className="button button-primary button-small" disabled={pending} onClick={() => run(() => dischargeAction(id, "", true))}>Oui, clôturer le séjour</button><button className="button button-secondary button-small" onClick={() => setConfirming(false)}>Revenir</button></div> : <button className="button button-secondary button-small" onClick={() => setConfirming(true)}>Enregistrer une sortie réelle</button>}{feedback}</div>;
}
