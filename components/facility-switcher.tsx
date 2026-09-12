"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { switchFacility } from "@/app/portal/actions";
import type { FacilitySummary } from "@/lib/types";

export function FacilitySwitcher({ facilities }: { facilities: FacilitySummary[] }) {
  const router = useRouter();
  const active = facilities.find((facility) => facility.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!active) return null;
  if (facilities.length === 1) return <span className="row-meta">{active.name}</span>;

  async function changeFacility(facilityId: string) {
    if (facilityId === active?.id) return;
    setLoading(true);
    setError("");
    const result = await switchFacility(facilityId);
    setLoading(false);
    if (result.error) return setError(result.error);
    router.push("/portal");
    router.refresh();
  }

  return <div>
    <select aria-label="Établissement actif" value={active.id} disabled={loading} onChange={(event) => changeFacility(event.target.value)}>
      {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.countryPackCode.replace("AURA_", "")}</option>)}
    </select>
    {error && <span className="form-error">{error}</span>}
  </div>;
}
