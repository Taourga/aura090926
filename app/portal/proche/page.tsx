import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { permissionLabels, type PermissionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type PortalData = {
  patient: { id: string; full_name: string };
  trusted_contact: { full_name: string; relationship: string; consented_at: string };
  scopes: Record<string, boolean>;
  stay: { room_number: string | null; presence: string; started_at: string; planned_discharge_at: string | null } | null;
  permissions: { id: string; departure_at: string; return_at: string; status: PermissionStatus }[];
  appointments: { id: string; title: string; starts_at: string; ends_at: string; location: string | null }[];
  activities: { title: string; starts_at: string; ends_at: string; location: string | null; attendance_status: string | null }[];
  visits: { id: string; scheduled_start: string; scheduled_end: string; visitor_one_name: string; visitor_two_name: string | null; status: string }[];
  menus: { service_date: string; meal: string; description: string }[];
  information: { id: string; title: string; body: string; starts_at: string | null; ends_at: string | null }[];
};

const presenceLabel = (value?: string | null) => value === "out" ? "Sorti temporairement" : value === "appointment" ? "En rendez-vous" : "Présent dans l’établissement";
const mealLabels: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", dinner: "Dîner" };
const mealLabel = (value: string) => mealLabels[value] || value;

export default async function TrustedContactPage() {
  const profile = await requireProfile();
  if (profile.role !== "trusted_contact") redirect("/portal");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trusted_contact_portal");
  if (error || !data) return <PortalShell profile={profile}><section className="card"><div className="card-body"><h1>Mon proche</h1><p role="alert">L’accès n’est pas disponible. Le patient ou l’établissement peut vérifier l’autorisation de partage.</p></div></section></PortalShell>;
  const portal = data as unknown as PortalData;
  const dt = (value: string | null | undefined) => value ? formatDateTime(value, profile.facility.locale, profile.facility.timezone) : "Non renseignée";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Portail proche autorisé</div><h1>{portal.patient.full_name}</h1><p>Les informations ci-dessous sont partagées avec vous avec l’accord du patient. Elles concernent l’organisation du séjour, pas le dossier médical.</p></div></div>

    <section className="metric-grid" style={{ marginBottom: 18 }}>
      <div className="metric"><span>Présence</span><strong style={{ fontSize: "1.15rem" }}>{presenceLabel(portal.stay?.presence)}</strong><div className="metric-detail">Chambre {portal.stay?.room_number || "—"}</div></div>
      <div className="metric"><span>Prochains rendez-vous</span><strong>{portal.appointments.length}</strong><div className="metric-detail">Sur les 14 prochains jours</div></div>
      <div className="metric"><span>Permissions</span><strong>{portal.permissions.length}</strong><div className="metric-detail">Récentes et à venir</div></div>
      <div className="metric"><span>Sortie définitive prévue</span><strong style={{ fontSize: "1rem" }}>{portal.stay?.planned_discharge_at ? dt(portal.stay.planned_discharge_at) : "Non prévue"}</strong><div className="metric-detail">Prévision communiquée par l’équipe</div></div>
    </section>

    <div className="patient-record-grid">
      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Planning</p><h2>Rendez-vous</h2></div></div><div className="work-card-body">{portal.appointments.length ? portal.appointments.map((item) => <div className="record-row" key={item.id}><div><strong>{item.title}</strong><small>{dt(item.starts_at)} · {item.location || "Lieu à confirmer"}</small></div><span className="badge badge-info">Prévu</span></div>) : <p className="empty">Aucun rendez-vous à venir.</p>}</div></section>

      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Permissions</p><h2>Sorties temporaires</h2></div></div><div className="work-card-body">{portal.permissions.length ? portal.permissions.map((item) => <div className="record-row" key={item.id}><div><strong>{dt(item.departure_at)}</strong><small>Retour prévu : {dt(item.return_at)}</small></div><span className="badge badge-neutral">{permissionLabels[item.status]}</span></div>) : <p className="empty">Aucune permission récente ou à venir.</p>}</div></section>

      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Vie du séjour</p><h2>Activités</h2></div></div><div className="work-card-body">{portal.activities.length ? portal.activities.map((item, index) => <div className="record-row" key={`${item.title}-${index}`}><div><strong>{item.title}</strong><small>{dt(item.starts_at)} · {item.location || "Lieu à confirmer"}</small></div><span className="badge badge-info">Inscrit</span></div>) : <p className="empty">Aucune activité affichée.</p>}</div></section>

      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Visites</p><h2>Visites enregistrées</h2></div></div><div className="work-card-body">{portal.visits.length ? portal.visits.map((item) => <div className="record-row" key={item.id}><div><strong>{item.visitor_one_name}{item.visitor_two_name ? ` · ${item.visitor_two_name}` : ""}</strong><small>{dt(item.scheduled_start)}</small></div><span className="badge badge-neutral">{item.status === "arrived" ? "Sur site" : item.status === "departed" ? "Terminée" : "Prévue"}</span></div>) : <p className="empty">Aucune visite récente.</p>}</div></section>

      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Restauration</p><h2>Menus</h2></div></div><div className="work-card-body">{portal.menus.length ? portal.menus.slice(0, 9).map((item, index) => <div className="record-row" key={`${item.service_date}-${item.meal}-${index}`}><div><strong>{mealLabel(item.meal)}</strong><small>{item.service_date} · {item.description}</small></div></div>) : <p className="empty">Aucun menu publié.</p>}</div></section>

      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Établissement</p><h2>Informations pratiques</h2></div></div><div className="work-card-body">{portal.information.length ? portal.information.slice(0, 6).map((item) => <div className="record-row" key={item.id}><div><strong>{item.title}</strong><small>{item.body}</small></div></div>) : <p className="empty">Aucune information en cours.</p>}</div></section>
    </div>

    <section className="overview-note" style={{ marginTop: 18 }}><strong>Accès sous consentement</strong><span>Vous êtes enregistré comme {portal.trusted_contact.relationship.toLowerCase()} de {portal.patient.full_name}. Le patient ou l’établissement peut retirer cet accès à tout moment.</span></section>
  </PortalShell>;
}
