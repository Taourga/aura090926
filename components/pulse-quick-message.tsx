"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendClinicalMessage } from "@/app/portal/messages/actions";
import { ActionFeedback } from "@/components/action-feedback";

type Contact = { id: string; full_name: string; role: string };
const labels: Record<string, string> = { doctor: "Médecin", nurse: "Infirmier·ère", manager: "Cadre", governance: "Gouvernance" };

export function PulseQuickMessage({ contacts }: { contacts: Contact[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const router = useRouter();

  return <form className="pulse-quick-message" onSubmit={(event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    startTransition(async () => {
      const response = await sendClinicalMessage(String(data.get("recipient")), String(data.get("body")), Number(data.get("priority") || 1));
      setResult(response);
      if (!response.error) { formEl.reset(); router.refresh(); }
    });
  }}>
    <div className="pulse-quick-fields">
      <label>À<select name="recipient" required defaultValue=""><option value="" disabled>Choisir…</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name} · {labels[c.role] || c.role}</option>)}</select></label>
      <label>Importance<select name="priority" defaultValue="1"><option value="1">1 · Normal</option><option value="2">2 · Important</option><option value="3">3 · Critique</option></select></label>
    </div>
    <label>Message<textarea name="body" required maxLength={500} rows={2} placeholder="Écrire un message rapide à l’équipe…" /></label>
    <div className="pulse-quick-footer"><ActionFeedback error={result.error} message={result.success} /><button className="button button-primary button-small" disabled={pending || !contacts.length}>{pending ? "Envoi…" : "Envoyer sans quitter Pulse"}</button></div>
  </form>;
}
