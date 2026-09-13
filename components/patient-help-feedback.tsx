"use client";

import { useState, useTransition } from "react";
import { completePatientHelp, submitDailyFeedback, submitPatientHelp } from "@/app/portal/patient-actions";
import { ActionFeedback } from "@/components/action-feedback";

const categories = [
  { value: "room", icon: "⌂", label: "Ma chambre" },
  { value: "meal", icon: "🍽", label: "Repas" },
  { value: "planning", icon: "◷", label: "Planning" },
  { value: "admin", icon: "▤", label: "Administratif" },
] as const;

export function PatientHelpCard() {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<(typeof categories)[number]["value"] | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ error?: string; success?: string }>({});

  return <section className="patient-help-card">
    <div className="patient-section-head"><div><span>Besoin d’aide ?</span><h2>Que puis-je demander ?</h2><p>Choisissez un sujet. AURA transmet la demande à la bonne équipe.</p></div></div>
    <div className="patient-help-options">{categories.map((item) => <button key={item.value} type="button" className={selected === item.value ? "active" : ""} aria-pressed={selected === item.value} onClick={() => setSelected(item.value)}><b>{item.icon}</b><span>{item.label}</span></button>)}</div>
    {selected && <div className="patient-help-compose"><label className="field">Un détail à ajouter ? <span className="field-optional">(facultatif)</span><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. lampe à vérifier, question sur un horaire…" /></label><button className="button button-primary" disabled={pending} onClick={() => startTransition(async () => { const response = await submitPatientHelp(selected, message); setResult(response); if (!response.error) { setSelected(null); setMessage(""); } })}>{pending ? "Envoi…" : "Envoyer"}</button></div>}
    <ActionFeedback error={result.error} message={result.success} />
    <small className="patient-help-note">Urgence ou besoin de soin immédiat : contactez directement l’équipe présente dans l’établissement.</small>
  </section>;
}

export function PatientDailyFeedback({ currentMood }: { currentMood?: number | null }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const options = [{ mood: 1 as const, emoji: "😟", label: "Difficile" }, { mood: 2 as const, emoji: "😐", label: "Ça va" }, { mood: 3 as const, emoji: "🙂", label: "Bien" }];
  return <section className="patient-feedback-card"><div><span className="section-kicker">Mon ressenti</span><h2>Comment se passe votre journée ?</h2><p>Un clic suffit. Ce retour porte sur votre séjour, pas sur votre suivi médical.</p></div><div className="patient-feedback-actions">{options.map((option) => <button key={option.mood} disabled={pending} className={currentMood === option.mood ? "active" : ""} aria-pressed={currentMood === option.mood} onClick={() => startTransition(async () => setResult(await submitDailyFeedback(option.mood, "")))}><span>{option.emoji}</span><small>{option.label}</small></button>)}</div><ActionFeedback error={result.error} message={result.success} /></section>;
}

export function CompletePatientHelpButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  return <div><button className="button button-primary button-small" disabled={pending} onClick={() => startTransition(async () => setResult(await completePatientHelp(id)))}>{pending ? "Enregistrement…" : "Traité"}</button><ActionFeedback error={result.error} message={result.success} /></div>;
}
