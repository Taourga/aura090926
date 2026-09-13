"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { markClinicalMessagesRead, sendClinicalMessage } from "@/app/portal/messages/actions";
import { ActionFeedback } from "@/components/action-feedback";

type ContactRole = "doctor" | "nurse" | "manager" | "governance";
type Contact = { id: string; full_name: string; role: ContactRole };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; priority: number; read_at: string | null; created_at: string };

const roleLabel: Record<ContactRole, string> = {
  doctor: "Médecin",
  nurse: "Infirmier·ère",
  manager: "Cadre",
  governance: "Gouvernance",
};
const priorityLabel: Record<number, string> = { 1: "Normal", 2: "Important", 3: "Critique" };

export function ClinicalMessenger({ currentUserId, contacts, initialMessages }: { currentUserId: string; contacts: Contact[]; initialMessages: Message[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(() => contacts.find((contact) => initialMessages.some((message) => message.sender_id === contact.id && !message.read_at))?.id || contacts[0]?.id || "");
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  const messages = useMemo(() => initialMessages.filter((message) => (message.sender_id === selectedId && message.recipient_id === currentUserId) || (message.sender_id === currentUserId && message.recipient_id === selectedId)), [currentUserId, initialMessages, selectedId]);
  const selected = contacts.find((contact) => contact.id === selectedId);

  async function selectContact(id: string) {
    setSelectedId(id); setFeedback({});
    if (initialMessages.some((message) => message.sender_id === id && !message.read_at)) {
      await markClinicalMessagesRead(id); router.refresh();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const recipientId = String(data.get("recipient") || selectedId);
    const body = String(data.get("body") || "");
    const priority = Number(data.get("priority") || 1);
    if (!recipientId) return;
    setSelectedId(recipientId); setLoading(true); setFeedback({});
    const result = await sendClinicalMessage(recipientId, body, priority);
    setFeedback(result); setLoading(false); if (result.success) { form.reset(); router.refresh(); }
  }

  return <section className="messenger card">
    <aside className="messenger-contacts" aria-label="Contacts">
      <div className="messenger-title"><strong>Contacts</strong><span>{contacts.length}</span></div>
      {contacts.map((contact) => {
        const unread = initialMessages.filter((message) => message.sender_id === contact.id && !message.read_at).length;
        return <button type="button" key={contact.id} onClick={() => selectContact(contact.id)} className={selectedId === contact.id ? "messenger-contact active" : "messenger-contact"}>
          <span className="avatar" aria-hidden="true">{contact.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
          <span><strong>{contact.full_name}</strong><small>{roleLabel[contact.role]}</small></span>{unread > 0 && <b>{unread}</b>}
        </button>;
      })}
      {!contacts.length && <p className="empty">Aucun contact disponible.</p>}
    </aside>

    <div className="messenger-thread">
      <div className="messenger-thread-head"><div><strong>{selected?.full_name || "Nouveau message"}</strong>{selected && <small>{roleLabel[selected.role]}</small>}</div><span className="demo-chip">Accusé de lecture actif</span></div>
      <div className="message-list" aria-live="polite">
        {messages.length ? messages.map((message) => <div key={message.id} className={`${message.sender_id === currentUserId ? "message-bubble own" : "message-bubble"} priority-${message.priority}`}>
          <div className="message-priority">Niveau {message.priority} · {priorityLabel[message.priority] || "Normal"}</div>
          <p>{message.body}</p>
          <time>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}
            {message.sender_id === currentUserId ? message.read_at ? ` · ✓✓ Lu ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.read_at))}` : " · ✓ Envoyé" : ""}
          </time>
        </div>) : <p className="empty">Choisissez un destinataire et commencez l’échange.</p>}
      </div>

      <form className="message-form" onSubmit={submit}>
        <ActionFeedback message={feedback.success} error={feedback.error} />
        <div className="message-compose-grid">
          <label className="field">Destinataire<select name="recipient" value={selectedId} onChange={(e) => selectContact(e.target.value)} required><option value="">Choisir un destinataire</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name} · {roleLabel[contact.role]}</option>)}</select></label>
          <label className="field">Importance<select name="priority" defaultValue="1"><option value="1">1 · Normal</option><option value="2">2 · Important</option><option value="3">3 · Critique</option></select></label>
        </div>
        <label className="field">Message<textarea name="body" required maxLength={2000} rows={3} placeholder="Écrire un message…" /></label>
        <button className="button button-primary" disabled={loading || !selectedId}>{loading ? "Envoi…" : "Envoyer"}</button>
      </form>
    </div>
  </section>;
}
