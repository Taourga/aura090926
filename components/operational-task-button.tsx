"use client";

import { useState, useTransition } from "react";
import { setOperationalTaskDone } from "@/app/portal/operations/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function OperationalTaskButton({ taskId, done = false, compact = true }: { taskId: string; done?: boolean; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  return <div className="ops-task-action">
    <button
      className={`button ${done ? "button-secondary" : "button-primary"}${compact ? " button-small" : ""}`}
      disabled={pending}
      onClick={() => startTransition(async () => setResult(await setOperationalTaskDone(taskId, !done)))}
    >{pending ? "Enregistrement…" : done ? "Rouvrir" : "Terminer"}</button>
    <ActionFeedback error={result.error} message={result.success} />
  </div>;
}
