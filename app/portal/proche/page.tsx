import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { permissionLabels, type PermissionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type PortalData = {
  patient: { id: string; full_name: string };
  trusted_contact: { full_name: string; relationship: string; consented_at: string | null; is_emergency_contact: boolean; preferred_contact_method: string; notification_preferences: Record<string, boolean>; access_expires_at: string | null };
  scopes: Record<string, boolean>;
  stay: { room_number: string | null; presence: string | null; started_at: string; planned_discharge_at: string | null } | null;
  permissions: { id: string; departure_at: string; return_at: string; status: PermissionStatus }[];
  appointments: { id: string; title: string; starts_at: string; ends_at: string; location: string | null }[];
  activities: { title: string; starts_at: string; ends_at: string; location: string | null; attendance_status: string | null }[];
  visits: { id: string; scheduled_start: string; scheduled_end: string; visitor_one_name: string; visitor_two_name: string | null; status: string }[];
  menus: { service_date: string; meal: string; description: string }[];
  information: { id: string; title: string; body: string; starts_at: string | null; ends_at: string | null }[];
  journal: { occurred_at: string; kind: string; title: string; detail: string }[];
};

const presenceLabel = (value?: string | null) => value === "out" ? "Sorti temporairement" : value === "appointment" ? "En rendez-vous" : value ? "Présent dans l’établissement" : "Non partagé";
const mealLabels: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", dinner: "Dîner" };
const mealLabel = (value: string) => mealLabels[value] || value;

export default async function TrustedContactPage() {
  const profile = await requireProfile();
  if (profile.role !== "trusted_contact") redirect("/portal");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trusted_contact_portal");
  if (error || !data) return <PortalShell profile={profile}><section className="card"><div className="card-body"><h1>Mon proche</h1><p role="alert">L’accès n’est pas disponible. Il peut avoir été révoqué, expiré ou modifié par le patient ou l’établissement.</p></div></section></PortalShell>;
  const portal = data as unknown as PortalData;
  const dt = (value: string | null | undefined) => value ? formatDateTime(value, profile.facility.locale, profile.facility.timezone) : "Non renseignée";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Portail proche autorisé</div><h1>{portal.patient.full_name}</h1><p>Vous voyez uniquement les informations de séjour que le patient a choisi de partager avec vous. Le dossier médical et les échanges internes restent privés.</p></div></div>

    <section className="family-preview-hero"><div><span className="identity-eyebrow">MON PROCHE</span><h2>{portal.patient.full_name}</h2><p>{portal.trusted_contact.relationship} · accès accordé à {portal.trusted_contact.full_name}{portal.trusted_contact.is_emergency_contact ? " · contact d’urgence" : ""}</p></div>{portal.scopes.presence && <div className="family-preview-presence"><span>Présence</span><strong>{presenceLabel(portal.stay?.presence)}</strong><small>Chambre {portal.stay?.room_number || "—"}</small></div>}</section>

    <section className="metric-grid" style={{ marginBottom: 18 }}>
      {portal.scopes.planning && <div className="metric"><span>Prochains rendez-vous</span><strong>{portal.appointments.length}</strong><div className="metric-detail">Sur les 14 prochains jours</div></div>}
      {portal.scopes.permissions && <div className="metric"><span>Permissions</span><strong>{portal.permissions.length}</strong><div className="metric-detail">Récentes et à venir</div></div>}
      {portal.scopes.discharge && <div className="metric"><span>Sortie définitive prévue</span><strong style={{ fontSize: "1rem" }}>{portal.stay?.planned_discharge_at ? dt(portal.stay.planned_discharge_at) : "Non prévue"}</strong><div className="metric-detail">Prévision communiquée par l’équipe</div></div>}
      <div className="metric"><span>Accès autorisé</span><strong style={{ fontSize: "1rem" }}>{portal.trusted_contact.access_expires_at ? `Jusqu’au ${dt(portal.trusted_contact.access_expires_at)}` : "Sans date de fin"}</strong><div className="metric-detail">Révocable à tout moment</div></div>
    </section>

    <div className="patient-record-grid">
      {portal.scopes.planning && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Planning</p><h2>Rendez-vous</h2></div></div><div className="work-card-body">{portal.appointments.length ? portal.appointments.map((item) => <div className="record-row" key={item.id}><div><strong>{item.title}</strong><small>{dt(item.starts_at)} · {item.location || "Lieu à confirmer"}</small></div><span className="badge badge-info">Prévu</span></div>) : <p className="empty">Aucun rendez-vous à venir.</p>}</div></section>}

      {portal.scopes.permissions && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Permissions</p><h2>Sorties temporaires</h2></div></div><div className="work-card-body">{portal.permissions.length ? portal.permissions.map((item) => <div className="record-row" key={item.id}><div><strong>{dt(item.departure_at)}</strong><small>Retour prévu : {dt(item.return_at)}</small></div><span className="badge badge-neutral">{permissionLabels[item.status]}</span></div>) : <p className="empty">Aucune permission récente ou à venir.</p>}</div></section>}

      {portal.scopes.activities && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Vie du séjour</p><h2>Activités</h2></div></div><div className="work-card-body">{portal.activities.length ? portal.activities.map((item, index) => <div className="record-row" key={`${item.title}-${index}`}><div><strong>{item.title}</strong><small>{dt(item.starts_at)} · {item.location || "Lieu à confirmer"}</small></div><span className="badge badge-info">Inscrit</span></div>) : <p className="empty">Aucune activité affichée.</p>}</div></section>}

      {portal.scopes.visits && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Visites</p><h2>Visites enregistrées</h2></div></div><div className="work-card-body">{portal.visits.length ? portal.visits.map((item) => <div className="record-row" key={item.id}><div><strong>{item.visitor_one_name}{item.visitor_two_name ? ` · ${item.visitor_two_name}` : ""}</strong><small>{dt(item.scheduled_start)}</small></div><span className="badge badge-neutral">{item.status === "arrived" ? "Sur site" : item.status === "departed" ? "Terminée" : "Prévue"}</span></div>) : <p className="empty">Aucune visite récente.</p>}</div></section>}

      {portal.scopes.menus && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Restauration</p><h2>Menus</h2></div></div><div className="work-card-body">{portal.menus.length ? portal.menus.slice(0, 9).map((item, index) => <div className="record-row" key={`${item.service_date}-${item.meal}-${index}`}><div><strong>{mealLabel(item.meal)}</strong><small>{item.service_date} · {item.description}</small></div></div>) : <p className="empty">Aucun menu publié.</p>}</div></section>}

      {portal.scopes.information && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Établissement</p><h2>Informations pratiques</h2></div></div><div className="work-card-body">{portal.information.length ? portal.information.slice(0, 6).map((item) => <div className="record-row" key={item.id}><div><strong>{item.title}</strong><small>{item.body}</small></div></div>) : <p className="empty">Aucune information en cours.</p>}</div></section>}

      <section className="work-card patient-record-grid--wide"><div className="work-card-head"><div><p className="section-kicker">Journal famille</p><h2>Derniers changements partagés</h2></div></div><div className="work-card-body family-journal">{portal.journal.length ? portal.journal.slice(0, 10).map((item, index) => <div className="family-journal-row" key={`${item.occurred_at}-${index}`}><span className="family-journal-dot" /><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{dt(item.occurred_at)}</time></div>) : <p className="empty">Aucun événement partagé récemment.</p>}</div></section>
    </div>

    <section className="overview-note" style={{ marginTop: 18 }}><strong>Accès sous consentement</strong><span>Vous êtes enregistré comme {portal.trusted_contact.relationship.toLowerCase()} de {portal.patient.full_name}. Le patient ou l’établissement peut modifier ou retirer cet accès à tout moment.</span></section>
  </PortalShell>;
}
