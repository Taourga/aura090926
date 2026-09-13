"use client";

import { useState, useTransition } from "react";
import { requestSituationBulletin, processSituationBulletin } from "@/app/portal/care-actions";
import { ActionFeedback } from "@/components/action-feedback";

export function BulletinRequestButton({ pending = false }: { pending?: boolean }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [isPending, startTransition] = useTransition();
  return <div>
    <button className="button button-primary" disabled={pending || isPending} onClick={() => startTransition(async () => setResult(await requestSituationBulletin()))}>
      {pending ? "Demande déjà envoyée" : isPending ? "Envoi…" : "Demander mon bulletin de situation"}
    </button>
    <ActionFeedback message={result.success} error={result.error} />
  </div>;
}

export function BulletinReceptionActions({ requestId, status }: { requestId: string; status: string }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [isPending, startTransition] = useTransition();
  const run = (action: "generate" | "send") => startTransition(async () => setResult(await processSituationBulletin(requestId, action)));
  return <div className="inline-actions">
    {status === "pending" && <button className="button button-secondary button-small" disabled={isPending} onClick={() => run("generate")}>Générer</button>}
    {status !== "sent" && <button className="button button-primary button-small" disabled={isPending} onClick={() => run("send")}>Envoyer par email</button>}
    <ActionFeedback message={result.success} error={result.error} />
  </div>;
}
