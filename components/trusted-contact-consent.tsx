"use client";

import { useMemo, useState, useTransition } from "react";
import { updateTrustedContactAccess } from "@/app/portal/contacts/actions";
import { ActionFeedback } from "@/components/action-feedback";

type ScopeKey = "presence" | "planning" | "permissions" | "activities" | "visits" | "menus" | "information" | "discharge";
type ScopeMap = Record<ScopeKey, boolean>;

const labels: { key: ScopeKey; label: string; detail: string }[] = [
  { key: "presence", label: "Présence", detail: "Présent, sorti temporairement ou en rendez-vous" },
  { key: "planning", label: "Planning", detail: "Rendez-vous et créneaux à venir" },
  { key: "permissions", label: "Permissions", detail: "Demandes et sorties temporaires" },
  { key: "activities", label: "Activités", detail: "Ateliers et activités du séjour" },
  { key: "visits", label: "Visites", detail: "Visites enregistrées auprès de l’accueil" },
  { key: "menus", label: "Menus", detail: "Menus publiés par l’établissement" },
  { key: "information", label: "Infos pratiques", detail: "Informations générales de la clinique" },
  { key: "discharge", label: "Sortie prévue", detail: "Date prévisionnelle de fin d’hospitalisation" },
];

export function TrustedContactConsent({ patientId, trustedName, initialEnabled, initialScopes, canManage }: {
  patientId: string;
  trustedName: string;
  initialEnabled: boolean;
  initialScopes: Partial<ScopeMap> | null;
  canManage: boolean;
}) {
  const defaults = useMemo<ScopeMap>(() => ({
    presence: initialScopes?.presence ?? true,
    planning: initialScopes?.planning ?? true,
    permissions: initialScopes?.permissions ?? true,
    activities: initialScopes?.activities ?? true,
    visits: initialScopes?.visits ?? true,
    menus: initialScopes?.menus ?? true,
    information: initialScopes?.information ?? true,
    discharge: initialScopes?.discharge ?? true,
  }), [initialScopes]);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [scopes, setScopes] = useState<ScopeMap>(defaults);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  if (!canManage) return null;

  function save(nextEnabled = enabled) {
    startTransition(async () => {
      const response = await updateTrustedContactAccess(patientId, nextEnabled, scopes);
      setResult(response);
      if (!response.error) setEnabled(nextEnabled);
    });
  }

  return <div className="trusted-consent">
    <div className="trusted-consent-head">
      <div><strong>Accès numérique de {trustedName}</strong><small>Choisissez précisément les informations partagées.</small></div>
      <span className={enabled ? "badge badge-success" : "badge badge-neutral"}>{enabled ? "Portail actif" : "Portail désactivé"}</span>
    </div>
    <div className="trusted-scope-grid">
      {labels.map((item) => <label className="trusted-scope" key={item.key}>
        <input type="checkbox" checked={scopes[item.key]} disabled={pending || !enabled} onChange={(event) => setScopes((current) => ({ ...current, [item.key]: event.target.checked }))} />
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
      </label>)}
    </div>
    <div className="inline-actions" style={{ marginTop: 12 }}>
      {enabled ? <>
        <button className="button button-primary button-small" disabled={pending} onClick={() => save(true)}>{pending ? "Enregistrement…" : "Enregistrer les autorisations"}</button>
        <button className="button button-danger button-small" disabled={pending} onClick={() => save(false)}>Révoquer l’accès</button>
      </> : <button className="button button-primary button-small" disabled={pending} onClick={() => save(true)}>{pending ? "Activation…" : "Activer le portail proche"}</button>}
    </div>
    <ActionFeedback message={result.success} error={result.error} />
  </div>;
}
