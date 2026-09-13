"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { updateTrustedContactAccess, updateTrustedContactPreferences } from "@/app/portal/contacts/actions";
import { ActionFeedback } from "@/components/action-feedback";

type ScopeKey = "presence" | "planning" | "permissions" | "activities" | "visits" | "menus" | "information" | "discharge";
type ScopeMap = Record<ScopeKey, boolean>;
type NotificationKey = "presence" | "planning" | "permissions" | "visits" | "discharge";
type NotificationMap = Record<NotificationKey, boolean>;

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

const notificationLabels: { key: NotificationKey; label: string }[] = [
  { key: "presence", label: "Changement de présence" },
  { key: "planning", label: "Nouveau rendez-vous / changement planning" },
  { key: "permissions", label: "Permission autorisée ou retour enregistré" },
  { key: "visits", label: "Nouvelle visite enregistrée" },
  { key: "discharge", label: "Sortie définitive prévue" },
];

export function TrustedContactConsent({ patientId, trustedName, initialEnabled, initialScopes, initialNotifications, initialExpiresAt, initialEmergencyContact, initialPreferredContactMethod, canManage, hasPortalAccount }: {
  patientId: string;
  trustedName: string;
  initialEnabled: boolean;
  initialScopes: Partial<ScopeMap> | null;
  initialNotifications: Partial<NotificationMap> | null;
  initialExpiresAt: string | null;
  initialEmergencyContact: boolean;
  initialPreferredContactMethod: "email" | "sms" | "none";
  canManage: boolean;
  hasPortalAccount: boolean;
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
  const notificationDefaults = useMemo<NotificationMap>(() => ({
    presence: initialNotifications?.presence ?? false,
    planning: initialNotifications?.planning ?? true,
    permissions: initialNotifications?.permissions ?? true,
    visits: initialNotifications?.visits ?? true,
    discharge: initialNotifications?.discharge ?? true,
  }), [initialNotifications]);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [scopes, setScopes] = useState<ScopeMap>(defaults);
  const [notifications, setNotifications] = useState<NotificationMap>(notificationDefaults);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt ? initialExpiresAt.slice(0, 16) : "");
  const [emergencyContact, setEmergencyContact] = useState(initialEmergencyContact);
  const [preferredContactMethod, setPreferredContactMethod] = useState<"email" | "sms" | "none">(initialPreferredContactMethod);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  if (!canManage) return null;

  function saveAccess(nextEnabled = enabled) {
    startTransition(async () => {
      const response = await updateTrustedContactAccess(patientId, nextEnabled, scopes);
      setResult(response);
      if (!response.error) setEnabled(nextEnabled);
    });
  }

  function savePreferences() {
    startTransition(async () => {
      const response = await updateTrustedContactPreferences({ patientId, notifications, accessExpiresAt: expiresAt, emergencyContact, preferredContactMethod });
      setResult(response);
    });
  }

  return <div className="trusted-consent">
    <div className="trusted-consent-head">
      <div><strong>Partage & consentement</strong><small>Choisissez précisément ce que {trustedName} peut consulter et quand l’accès prend fin.</small></div>
      <span className={enabled ? "badge badge-success" : "badge badge-neutral"}>{enabled ? "Portail actif" : hasPortalAccount ? "Portail désactivé" : "Compte non créé"}</span>
    </div>

    {!hasPortalAccount && <div className="consent-warning"><strong>Contact uniquement</strong><span>Un compte “Proche autorisé” doit être créé et rattaché avant de pouvoir activer le portail.</span></div>}

    <div className="trusted-scope-grid">
      {labels.map((item) => <label className="trusted-scope" key={item.key}>
        <input type="checkbox" checked={scopes[item.key]} disabled={pending || !hasPortalAccount} onChange={(event) => setScopes((current) => ({ ...current, [item.key]: event.target.checked }))} />
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
      </label>)}
    </div>

    <div className="family-settings-grid">
      <section className="family-settings-panel">
        <h3>Notifications du proche</h3>
        <p>Choisissez les changements qui doivent être signalés au proche autorisé.</p>
        {notificationLabels.map((item) => <label className="family-notification" key={item.key}><input type="checkbox" checked={notifications[item.key]} disabled={pending || !hasPortalAccount} onChange={(event) => setNotifications((current) => ({ ...current, [item.key]: event.target.checked }))} /><span>{item.label}</span></label>)}
      </section>
      <section className="family-settings-panel">
        <h3>Accès & contact</h3>
        <label className="field-label">Canal préféré<select value={preferredContactMethod} disabled={pending} onChange={(event) => setPreferredContactMethod(event.target.value as "email" | "sms" | "none")}><option value="email">Email</option><option value="sms">SMS</option><option value="none">Aucune notification externe</option></select></label>
        <label className="field-label">Fin automatique de l’accès<input type="datetime-local" value={expiresAt} disabled={pending || !hasPortalAccount} onChange={(event) => setExpiresAt(event.target.value)} /></label>
        <label className="family-notification"><input type="checkbox" checked={emergencyContact} disabled={pending} onChange={(event) => setEmergencyContact(event.target.checked)} /><span>Également contact d’urgence</span></label>
      </section>
    </div>

    <div className="inline-actions family-actions">
      <button className="button button-secondary button-small" disabled={pending} onClick={savePreferences}>{pending ? "Enregistrement…" : "Enregistrer les préférences"}</button>
      {hasPortalAccount && <Link className="button button-secondary button-small" href={`/portal/contacts/preview?patient=${patientId}`}>Voir comme le proche</Link>}
      {hasPortalAccount && (enabled ? <>
        <button className="button button-primary button-small" disabled={pending} onClick={() => saveAccess(true)}>{pending ? "Enregistrement…" : "Enregistrer les autorisations"}</button>
        <button className="button button-danger button-small" disabled={pending} onClick={() => saveAccess(false)}>Révoquer l’accès</button>
      </> : <button className="button button-primary button-small" disabled={pending} onClick={() => saveAccess(true)}>{pending ? "Activation…" : "Activer le portail proche"}</button>)}
    </div>
    <ActionFeedback message={result.success} error={result.error} />
  </div>;
}
