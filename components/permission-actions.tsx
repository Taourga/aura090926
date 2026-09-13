"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decidePermission, recordMovement } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function PermissionDecisionActions({ permissionId }: { permissionId: string }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function decide(decision: "approved" | "refused") {
    setLoading(true);
    const response = await decidePermission(permissionId, decision);
    setResult(response);
    setLoading(false);
    if (!response.error) router.refresh();
  }
  return <div><ActionFeedback message={result.success} error={result.error} /><div className="inline-actions"><button className="button button-primary button-small" disabled={loading} onClick={() => decide("approved")}>Valider</button><button className="button button-danger button-small" disabled={loading} onClick={() => decide("refused")}>Refuser</button></div></div>;
}

export function MovementActions({ permissionId, action }: { permissionId: string; action: "depart" | "return" }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function save() {
    setLoading(true);
    const response = await recordMovement(permissionId, action);
    setResult(response);
    setLoading(false);
    if (!response.error) router.refresh();
  }
  return <div><ActionFeedback message={result.success} error={result.error} /><button className="button button-primary button-small" disabled={loading} onClick={save}>{loading ? "Validation..." : action === "depart" ? "Valider la sortie" : "Valider le retour"}</button></div>;
}
