"use client";

import { useState } from "react";
import { updateUser } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";
import type { AppRole } from "@/lib/types";
import { roleLabels } from "@/lib/types";

const roles = Object.keys(roleLabels) as AppRole[];

export function UserEditor({ user }: { user: { id: string; full_name: string; role: AppRole; active: boolean } }) {
  const [role, setRole] = useState<AppRole>(user.role); const [active, setActive] = useState(user.active); const [result, setResult] = useState<{ error?: string; success?: string }>({}); const [loading, setLoading] = useState(false);
  async function save() { setLoading(true); setResult(await updateUser({ userId: user.id, role, active })); setLoading(false); }
  return <tr><td><strong>{user.full_name}</strong></td><td><select aria-label={`Rôle de ${user.full_name}`} value={role} onChange={(e) => setRole(e.target.value as AppRole)}>{roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</select></td><td><label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Actif</label></td><td><button className="button button-secondary button-small" disabled={loading} onClick={save}>{loading ? "..." : "Enregistrer"}</button><ActionFeedback message={result.success} error={result.error} /></td></tr>;
}
