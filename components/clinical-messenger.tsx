"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { markClinicalMessagesRead, sendClinicalMessage } from "@/app/portal/messages/actions";
import { ActionFeedback } from "@/components/action-feedback";

type ContactRole = "doctor" | "nurse" | "manager" | "governance" | "patient";
type Contact = { id: string; full_name: string; role: ContactRole };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; priority: number; read_at: string | null; created_at: string };

const roleLabel: Record<ContactRole, string> = {
  doctor: "Médecin",
  nurse: "Équipe soignante",
  manager: "Cadre",
  governance: "Gouvernance",
  patient: "Patient",
};
const priorityLabel: Record<number, string> = { 1: "Normal", 2: "Important", 3: "Critique" };

export function ClinicalMessenger({ currentUserId, contacts, initialMessages, isPatient = false, initialSelectedId }: { currentUserId: string; contacts: Contact[]; initialMessages: Message[]; isPatient?: boolean; initialSelectedId?: string | null }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(() => {
    if (initialSelectedId && contacts.some((contact) => contact.id === initialSelectedId)) return initialSelectedId;
    return contacts.find((contact) => initialMessages.some((message) => message.sender_id === contact.id && !message.read_at))?.id || contacts[0]?.id || "";
  });
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  const messages = useMemo(() => initialMessages.filter((message) => (message.sender_id === selectedId && message.recipient_id === currentUserId) || (message.sender_id === currentUserId && message.recipient_id === selectedId)), [currentUserId, initialMessages, selectedId]);
  const selected = contacts.find((contact) => contact.id === selectedId);

  useEffect(() => {
    if (!selectedId || !initialMessages.some((message) => message.sender_id === selectedId && !message.read_at)) return;
    let active = true;
    void markClinicalMessagesRead(selectedId).then(() => { if (active) router.refresh(); });
    return () => { active = false; };
  }, [initialMessages, router, selectedId]);

  async function selectContact(id: string) {
    setSelectedId(id); setFeedback({});
    if (typeof window !== "undefined") window.history.replaceState(null, "", `/portal/messages?contact=${encodeURIComponent(id)}`);
    if (initialMessages.some((message) => message.sender_id === id && !message.read_at)) {
      await markClinicalMessagesRead(id); router.refresh();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPatient) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const recipientId = String(data.get("recipient") || selectedId);
    const body = String(data.get("body") || "");
    const priority = Number(data.get("priority") || 1);
    if (!recipientId) return;
    setLoading(true); setFeedback({});
    const result = await sendClinicalMessage(recipientId, body, priority);
    setFeedback(result); setLoading(false); if (result.success) { form.reset(); router.refresh(); }
  }

  return <section className={`messenger card ${isPatient ? "patient-inbox-only" : ""}`}>
    <aside className="messenger-contacts" aria-label={isPatient ? "Expéditeurs" : "Contacts"}>
      <div className="messenger-title"><strong>{isPatient ? "Messages de" : "Conversations"}</strong><span>{contacts.length}</span></div>
      {contacts.map((contact) => {
        const unread = initialMessages.filter((message) => message.sender_id === contact.id && !message.read_at).length;
        return <button type="button" key={contact.id} onClick={() => selectContact(contact.id)} className={selectedId === contact.id ? "messenger-contact active" : "messenger-contact"} aria-pressed={selectedId === contact.id}>
          <span className="avatar" aria-hidden="true">{contact.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
          <span><strong>{contact.full_name}</strong><small>{roleLabel[contact.role]}</small></span>{unread > 0 && <b>{unread}</b>}
        </button>;
      })}
      {!contacts.length && <p className="empty">{isPatient ? "Aucun message reçu pour le moment." : "Aucun contact disponible."}</p>}
    </aside>

    <div className="messenger-thread">
      <div className="messenger-thread-head"><div><strong>{selected?.full_name || (isPatient ? "Mes messages" : "Choisissez une conversation")}</strong>{selected && <small>{roleLabel[selected.role]}</small>}</div>{selected && <span className="demo-chip">{isPatient ? "Réception uniquement" : "Lecture suivie"}</span>}</div>
      <div className="message-list" aria-live="polite">
        {messages.length ? messages.map((message) => <div key={message.id} className={`${message.sender_id === currentUserId ? "message-bubble own" : "message-bubble"} priority-${message.priority}`}>
          {!isPatient && message.priority > 1 && <div className="message-priority">{priorityLabel[message.priority] || "Important"}</div>}
          <p>{message.body}</p>
          <time>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}
            {message.sender_id === currentUserId ? message.read_at ? ` · ✓✓ Lu ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.read_at))}` : " · ✓ Envoyé" : ""}
          </time>
        </div>) : <p className="empty">{isPatient ? "Aucun message reçu dans cette conversation." : selected ? "Aucun message pour le moment. Écrivez le premier message ci-dessous." : "Choisissez une conversation dans la liste."}</p>}
      </div>

      {!isPatient && <form className="message-form" onSubmit={submit}>
        <ActionFeedback message={feedback.success} error={feedback.error} />
        <input type="hidden" name="recipient" value={selectedId} />
        <div className="message-priority-select"><label className="field">Importance<select name="priority" defaultValue="1"><option value="1">Normal</option><option value="2">Important</option><option value="3">Critique</option></select></label></div>
        <label className="field">Message<textarea name="body" required maxLength={2000} rows={3} placeholder={selected ? `Écrire à ${selected.full_name}…` : "Choisissez d’abord une conversation"} disabled={!selectedId} /></label>
        <button className="button button-primary" disabled={loading || !selectedId}>{loading ? "Envoi…" : "Envoyer"}</button>
      </form>}
      {isPatient && <div className="patient-inbox-note">Vous pouvez consulter les messages reçus. Pour toute demande, contactez directement l’accueil ou l’équipe soignante selon les consignes de l’établissement.</div>}
    </div>
  </section>;
}
