"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { markClinicalMessagesRead, sendClinicalMessage } from "@/app/portal/messages/actions";
import { ActionFeedback } from "@/components/action-feedback";

type Contact = { id: string; full_name: string; role: "doctor" | "nurse" };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; created_at: string };

export function ClinicalMessenger({ currentUserId, contacts, initialMessages }: { currentUserId: string; contacts: Contact[]; initialMessages: Message[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(() => contacts.find((contact) => initialMessages.some((message) => message.sender_id === contact.id && !message.read_at))?.id || contacts[0]?.id || "");
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  const messages = useMemo(() => initialMessages.filter((message) => (message.sender_id === selectedId && message.recipient_id === currentUserId) || (message.sender_id === currentUserId && message.recipient_id === selectedId)), [currentUserId, initialMessages, selectedId]);

  async function selectContact(id: string) {
    setSelectedId(id); setFeedback({});
    if (initialMessages.some((message) => message.sender_id === id && !message.read_at)) {
      await markClinicalMessagesRead(id); router.refresh();
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedId) return;
    setLoading(true); setFeedback({}); const form = event.currentTarget; const data = new FormData(form);
    const result = await sendClinicalMessage(selectedId, String(data.get("body")));
    setFeedback(result); setLoading(false); if (result.success) { form.reset(); router.refresh(); }
  }

  return <section className="messenger card">
    <aside className="messenger-contacts" aria-label="Contacts">
      <div className="messenger-title"><strong>Équipe</strong><span>{contacts.length}</span></div>
      {contacts.map((contact) => { const unread = initialMessages.filter((message) => message.sender_id === contact.id && !message.read_at).length; return <button type="button" key={contact.id} onClick={() => selectContact(contact.id)} className={selectedId === contact.id ? "messenger-contact active" : "messenger-contact"}><span className="avatar" aria-hidden="true">{contact.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{contact.full_name}</strong><small>{contact.role === "doctor" ? "Médecin" : "Infirmier·ère"}</small></span>{unread > 0 && <b>{unread}</b>}</button>; })}
      {!contacts.length && <p className="empty">Aucun contact disponible.</p>}
    </aside>
    <div className="messenger-thread">
      <div className="message-list" aria-live="polite">
        {messages.length ? messages.map((message) => <div key={message.id} className={message.sender_id === currentUserId ? "message-bubble own" : "message-bubble"}><p>{message.body}</p><time>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}{message.sender_id === currentUserId ? message.read_at ? " · Lu" : " · Envoyé" : ""}</time></div>) : <p className="empty">Sélectionnez un contact et commencez l’échange.</p>}
      </div>
      <form className="message-form" onSubmit={submit}><ActionFeedback message={feedback.success} error={feedback.error} /><label className="field">Message<textarea name="body" required maxLength={2000} rows={3} placeholder="Écrire un message clinique…" /></label><button className="button button-primary" disabled={loading || !selectedId}>{loading ? "Envoi…" : "Envoyer"}</button></form>
    </div>
  </section>;
}

