"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function PatientPresenceFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("presence") || "all";
  const presentChecked = current === "all" || current === "present";
  const absentChecked = current === "all" || current === "out";

  const update = (nextPresent: boolean, nextAbsent: boolean) => {
    const next = new URLSearchParams(params.toString());
    if (nextPresent && nextAbsent) next.delete("presence");
    else if (nextPresent) next.set("presence", "present");
    else if (nextAbsent) next.set("presence", "out");
    else next.set("presence", "none");
    next.delete("patient");
    router.push(`/portal/patients?${next.toString()}`);
  };

  return <div className="patient-presence-checks" aria-label="Filtre de présence">
    <span>Afficher :</span>
    <label><input type="checkbox" checked={presentChecked} onChange={(event)=>update(event.target.checked, absentChecked)} /> Présents</label>
    <label><input type="checkbox" checked={absentChecked} onChange={(event)=>update(presentChecked, event.target.checked)} /> Absents</label>
  </div>;
}
