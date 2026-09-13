import Link from "next/link";
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
  activities: { title: string; starts_at: string; ends_at: string; location: string | null }[];
  visits: { id: string; scheduled_start: string; visitor_one_name: string; status: string }[];
  menus: { service_date: string; meal: string; description: string }[];
  information: { id: string; title: string; body: string }[];
  journal: { occurred_at: string; kind: string; title: string; detail: string }[];
};

const presenceLabel = (value?: string | null) => value === "out" ? "Sorti temporairement" : value === "appointment" ? "En rendez-vous" : value ? "Présent dans l’établissement" : "Masqué";

export default async function TrustedContactPreviewPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const profile = await requireProfile();
  const allowed = ["patient", "doctor", "nurse", "manager", "admin"];
  if (!allowed.includes(profile.role)) redirect("/portal");
  const { patient } = await searchParams;
  if (!patient) redirect("/portal/contacts");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_trusted_contact_portal", { p_patient_id: patient });
  if (error || !data) return <PortalShell profile={profile}><section className="card"><div className="card-body"><h1>Aperçu indisponible</h1><p>{error?.message || "Aucune donnée à afficher."}</p><Link href="/portal/contacts" className="button button-secondary">Retour aux contacts</Link></div></section></PortalShell>;
  const portal = data as PortalData;
  const dt = (value?: string | null) => value ? formatDateTime(value, profile.facility.locale, profile.facility.timezone) : "Non renseigné";

  return <PortalShell profile={profile}>
    <div className="family-preview-banner"><div><span>APERÇU SÉCURISÉ</span><h1>Voici exactement ce que voit {portal.trusted_contact.full_name}</h1><p>Aucune donnée supplémentaire n’est affichée dans le vrai portail du proche.</p></div><Link href="/portal/contacts" className="button button-secondary">← Retour au consentement</Link></div>

    <section className="family-preview-hero"><div><span className="identity-eyebrow">MON PROCHE</span><h2>{portal.patient.full_name}</h2><p>{portal.trusted_contact.relationship} · accès accordé à {portal.trusted_contact.full_name}</p></div><div className="family-preview-presence"><span>Présence</span><strong>{presenceLabel(portal.stay?.presence)}</strong><small>Chambre {portal.stay?.room_number || "—"}</small></div></section>

    <div className="patient-record-grid">
      {portal.scopes.planning && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Planning</p><h2>Rendez-vous</h2></div></div><div className="work-card-body">{portal.appointments.length ? portal.appointments.map((item) => <div className="record-row" key={item.id}><div><strong>{item.title}</strong><small>{dt(item.starts_at)} · {item.location || "Lieu à confirmer"}</small></div></div>) : <p className="empty">Aucun rendez-vous à venir.</p>}</div></section>}
      {portal.scopes.permissions && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Permissions</p><h2>Sorties temporaires</h2></div></div><div className="work-card-body">{portal.permissions.length ? portal.permissions.map((item) => <div className="record-row" key={item.id}><div><strong>{dt(item.departure_at)}</strong><small>Retour prévu : {dt(item.return_at)}</small></div><span className="badge badge-neutral">{permissionLabels[item.status]}</span></div>) : <p className="empty">Aucune permission visible.</p>}</div></section>}
      {portal.scopes.activities && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Vie du séjour</p><h2>Activités</h2></div></div><div className="work-card-body">{portal.activities.length ? portal.activities.map((item, i) => <div className="record-row" key={`${item.title}-${i}`}><div><strong>{item.title}</strong><small>{dt(item.starts_at)} · {item.location || "Lieu à confirmer"}</small></div></div>) : <p className="empty">Aucune activité visible.</p>}</div></section>}
      {portal.scopes.visits && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Visites</p><h2>Visites enregistrées</h2></div></div><div className="work-card-body">{portal.visits.length ? portal.visits.map((item) => <div className="record-row" key={item.id}><div><strong>{item.visitor_one_name}</strong><small>{dt(item.scheduled_start)}</small></div><span className="badge badge-neutral">{item.status}</span></div>) : <p className="empty">Aucune visite visible.</p>}</div></section>}
      {portal.scopes.menus && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Restauration</p><h2>Menus</h2></div></div><div className="work-card-body">{portal.menus.length ? portal.menus.slice(0, 6).map((item, i) => <div className="record-row" key={`${item.service_date}-${i}`}><div><strong>{item.meal}</strong><small>{item.service_date} · {item.description}</small></div></div>) : <p className="empty">Aucun menu visible.</p>}</div></section>}
      {portal.scopes.discharge && <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Fin de séjour</p><h2>Sortie définitive prévue</h2></div></div><div className="work-card-body"><div className="record-row"><div><strong>{portal.stay?.planned_discharge_at ? dt(portal.stay.planned_discharge_at) : "Non planifiée"}</strong><small>Prévision communiquée par l’équipe.</small></div></div></div></section>}
      <section className="work-card patient-record-grid--wide"><div className="work-card-head"><div><p className="section-kicker">Journal famille</p><h2>Derniers changements partagés</h2></div></div><div className="work-card-body family-journal">{portal.journal.length ? portal.journal.slice(0, 10).map((item, i) => <div className="family-journal-row" key={`${item.occurred_at}-${i}`}><span className="family-journal-dot" /><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{dt(item.occurred_at)}</time></div>) : <p className="empty">Aucun événement partagé récemment.</p>}</div></section>
    </div>
  </PortalShell>;
}
