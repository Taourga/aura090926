"use client";

import { useState } from "react";
import { recordVisitMovement } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function VisitMovementActions({ visitId, action }: { visitId: string; action: "arrive" | "depart" }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function submit() { setLoading(true); setResult(await recordVisitMovement(visitId, action)); setLoading(false); }
  return <div><ActionFeedback message={result.success} error={result.error} /><button className={action === "arrive" ? "button button-primary button-small" : "button button-secondary button-small"} onClick={submit} disabled={loading}>{loading ? "..." : action === "arrive" ? "Valider l’entrée" : "Valider le départ"}</button></div>;
}
