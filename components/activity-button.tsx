"use client";

import { useState } from "react";
import { cancelActivityEnrollment, enrollActivity } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function ActivityButton({ activityId, enrolled, full }: { activityId: string; enrolled: boolean; full: boolean }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function act() { setLoading(true); setResult(enrolled ? await cancelActivityEnrollment(activityId) : await enrollActivity(activityId)); setLoading(false); }
  return <div><ActionFeedback message={result.success} error={result.error} /><button className={enrolled ? "button button-secondary button-small" : "button button-primary button-small"} disabled={loading || (!enrolled && full)} onClick={act}>{loading ? "..." : enrolled ? "Me désinscrire" : full ? "Complet" : "M’inscrire"}</button></div>;
}
