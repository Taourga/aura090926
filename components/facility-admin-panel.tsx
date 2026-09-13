"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { applyCountryPack, createFacility, inviteFacilityMember, updateFacilitySettings } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { invitePatient } from "@/app/portal/admin/patient-invitation";
import type { AppRole, CountryPackCode, FacilityConfig, Profile } from "@/lib/types";
import { roleLabels } from "@/lib/types";

const roles = Object.keys(roleLabels) as AppRole[];
const packs: { code: CountryPackCode; label: string }[] = [
  { code: "AURA_CORE", label: "AURA Core" },
  { code: "AURA_FR", label: "AURA France" },
  { code: "AURA_DZ", label: "AURA Algérie" },
];

function bool(config: FacilityConfig, key: string, fallback = true) {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}
function num(config: FacilityConfig, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" ? value : fallback;
}
function text(config: FacilityConfig, key: string, fallback: string) {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}

export function FacilityAdminPanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<{ error?: string; success?: string }>) {
    setLoading(true); setResult({});
    const reply = await action();
    setResult(reply); setLoading(false);
    if (reply.success) router.refresh();
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const settings: FacilityConfig = {
      "permissions.min_notice_hours": Number(form.get("noticeHours")),
      "visits.start_time": String(form.get("visitStart")),
      "visits.end_time": String(form.get("visitEnd")),
      "visits.max_duration_minutes": Number(form.get("visitDuration")),
      "visits.max_visitors": Number(form.get("maxVisitors")),
      "visits.max_per_day": Number(form.get("maxVisits")),
      "meals.breakfast_time": String(form.get("breakfast")),
      "meals.lunch_time": String(form.get("lunch")),
      "meals.dinner_time": String(form.get("dinner")),
      "features.permissions": form.get("featurePermissions") === "on",
      "features.activities": form.get("featureActivities") === "on",
      "features.housekeeping": form.get("featureHousekeeping") === "on",
      "features.sport": form.get("featureSport") === "on",
      "features.visits": form.get("featureVisits") === "on",
      "features.messaging": form.get("featureMessaging") === "on",
      "features.menus": form.get("featureMenus") === "on",
      "features.information": form.get("featureInformation") === "on",
    };
    await run(() => updateFacilitySettings(settings));
  }

  return <>
    <ActionFeedback message={result.success} error={result.error} />
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-header"><div><h2>Inviter un patient</h2><p className="card-subtitle">Envoyer un lien pour choisir son mot de passe et créer son séjour dans cet établissement.</p></div></div>
      <div className="card-body"><form onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(() => invitePatient({ firstName: String(form.get("firstName")), lastName: String(form.get("lastName")), email: String(form.get("patientEmail")), entryDate: String(form.get("entryDate")) }));
      }}>
        <div className="form-grid">
          <label className="field">Prénom<input name="firstName" autoComplete="given-name" maxLength={100} required /></label>
          <label className="field">Nom<input name="lastName" autoComplete="family-name" maxLength={100} required /></label>
          <label className="field">Email du patient<input name="patientEmail" type="email" autoComplete="email" maxLength={254} required /></label>
          <label className="field">Date d’entrée<input name="entryDate" type="date" required /></label>
        </div>
        <button className="button button-primary" disabled={loading}>{loading ? "Traitement…" : "Envoyer l’invitation patient"}</button>
      </form></div>
    </section>
    <div className="metric-grid">
      <div className="metric"><span>Établissement</span><strong>{profile.facility.name}</strong><div className="metric-detail">{profile.facility.countryCode} · {profile.facility.timezone}</div></div>
      <div className="metric"><span>Country Pack</span><strong>{profile.facility.countryPackCode.replace("AURA_", "")}</strong><div className="metric-detail">{profile.facility.locale} · {profile.facility.currency}</div></div>
      <div className="metric"><span>Cliniques accessibles</span><strong>{profile.facilities.length}</strong><div className="metric-detail">Même AURA Core</div></div>
    </div>

    <section className="card" style={{ marginTop: 18 }}>
      <div className="card-header"><div><h2>Country Pack</h2><p className="card-subtitle">Applique un preset marché. Les réglages spécifiques seront réinitialisés.</p></div></div>
      <div className="card-body"><div className="form-grid"><label className="field">Preset<select id="country-pack" defaultValue={profile.facility.countryPackCode}>{packs.map((pack) => <option key={pack.code} value={pack.code}>{pack.label}</option>)}</select></label><div className="field"><span>&nbsp;</span><button className="button button-secondary" disabled={loading} onClick={() => { const element = document.getElementById("country-pack") as HTMLSelectElement; run(() => applyCountryPack(element.value as CountryPackCode)); }}>Appliquer le Country Pack</button></div></div></div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <div className="card-header"><div><h2>Règles de l’établissement</h2><p className="card-subtitle">Ces valeurs remplacent les valeurs par défaut du Country Pack.</p></div></div>
      <div className="card-body"><form onSubmit={saveSettings}>
        <div className="form-grid">
          <label className="field">Préavis permission (heures)<input name="noticeHours" type="number" min="0" max="168" defaultValue={num(profile.facilityConfig, "permissions.min_notice_hours", 48)} required /></label>
          <label className="field">Début des visites<input name="visitStart" type="time" defaultValue={text(profile.facilityConfig, "visits.start_time", "13:00")} required /></label>
          <label className="field">Fin des visites<input name="visitEnd" type="time" defaultValue={text(profile.facilityConfig, "visits.end_time", "17:00")} required /></label>
          <label className="field">Durée max visite (min)<input name="visitDuration" type="number" min="15" max="240" defaultValue={num(profile.facilityConfig, "visits.max_duration_minutes", 60)} required /></label>
          <label className="field">Visiteurs max<input name="maxVisitors" type="number" min="1" max="2" defaultValue={num(profile.facilityConfig, "visits.max_visitors", 2)} required /></label>
          <label className="field">Visites max / jour<input name="maxVisits" type="number" min="1" max="4" defaultValue={num(profile.facilityConfig, "visits.max_per_day", 1)} required /></label>
          <label className="field">Petit-déjeuner<input name="breakfast" type="time" defaultValue={text(profile.facilityConfig, "meals.breakfast_time", "08:00")} required /></label>
          <label className="field">Déjeuner<input name="lunch" type="time" defaultValue={text(profile.facilityConfig, "meals.lunch_time", "12:00")} required /></label>
          <label className="field">Dîner<input name="dinner" type="time" defaultValue={text(profile.facilityConfig, "meals.dinner_time", "19:00")} required /></label>
        </div>
        <h3 style={{ marginTop: 20 }}>Modules actifs</h3>
        <div className="form-grid">
          {[
            ["featurePermissions", "permissions", "Permissions"], ["featureActivities", "activities", "Activités"], ["featureHousekeeping", "housekeeping", "Hôtellerie"], ["featureSport", "sport", "Salle de sport"],
            ["featureVisits", "visits", "Visites"], ["featureMessaging", "messaging", "Messagerie"], ["featureMenus", "menus", "Menus"], ["featureInformation", "information", "Informations"],
          ].map(([name, key, label]) => <label className="field" key={key}><span>{label}</span><input name={name} type="checkbox" defaultChecked={bool(profile.facilityConfig, `features.${key}`)} /></label>)}
        </div>
        <button className="button button-primary" disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer la configuration"}</button>
      </form></div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <div className="card-header"><div><h2>Inviter un utilisateur</h2><p className="card-subtitle">Si son compte AURA existe déjà, l’accès est immédiat. Sinon l’invitation sera associée à son email lors de la création du compte.</p></div></div>
      <div className="card-body"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); run(() => inviteFacilityMember(String(form.get("email")), String(form.get("role")) as AppRole)); }}><div className="form-grid"><label className="field">Email<input name="email" type="email" required /></label><label className="field">Rôle<select name="role" defaultValue="patient">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label></div><button className="button button-secondary" disabled={loading}>Enregistrer l’invitation</button></form></div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <div className="card-header"><div><h2>Créer un autre établissement</h2><p className="card-subtitle">Crée une nouvelle clinique dans la même organisation AURA et vous ajoute comme administrateur.</p></div></div>
      <div className="card-body"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); run(() => createFacility(String(form.get("name")), String(form.get("pack")) as CountryPackCode)); }}><div className="form-grid"><label className="field">Nom de la clinique<input name="name" required /></label><label className="field">Country Pack<select name="pack" defaultValue="AURA_FR">{packs.map((pack) => <option key={pack.code} value={pack.code}>{pack.label}</option>)}</select></label></div><button className="button button-secondary" disabled={loading}>Créer l’établissement</button></form></div>
    </section>
  </>;
}
