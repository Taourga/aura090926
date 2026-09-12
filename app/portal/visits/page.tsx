import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { VisitForm } from "@/components/visit-form";
import { VisitMovementActions } from "@/components/visit-actions";
import { facilitySettingNumber, facilitySettingText, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { visitLabels, type VisitStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VisitsPage() {
  const profile = await requireProfile();
  if (profile.role !== "patient" && profile.role !== "reception") redirect("/portal");
  const supabase = await createClient();
  const startTime = facilitySettingText(profile, "visits.start_time", "13:00");
  const endTime = facilitySettingText(profile, "visits.end_time", "17:00");
  const maxDurationMinutes = facilitySettingNumber(profile, "visits.max_duration_minutes", 60);
  const maxVisitors = facilitySettingNumber(profile, "visits.max_visitors", 2);
  const maxPerDay = facilitySettingNumber(profile, "visits.max_per_day", 1);
  const query = supabase.from("visit_notifications").select("id, patient_id, scheduled_start, scheduled_end, visitor_one_name, visitor_two_name, status, arrived_at, departed_at, patient:profiles!visit_notifications_patient_id_fkey(full_name)").order("scheduled_start", { ascending: false }).limit(100);
  const { data: visits } = profile.role === "patient" ? await query.eq("patient_id", profile.id) : await query;
  const title = profile.role === "patient" ? "Mes visites" : "Visiteurs attendus";
  const futureVisits = (visits || []).filter((visit) => new Date(visit.scheduled_end) >= new Date() || visit.status === "arrived");
  const pastVisits = (visits || []).filter((visit) => !futureVisits.includes(visit));
  const renderRow = (visit: NonNullable<typeof visits>[number]) => {
    const patient = Array.isArray(visit.patient) ? visit.patient[0] : visit.patient;
    const visitors = [visit.visitor_one_name, visit.visitor_two_name].filter(Boolean).join(" · ");
    const action = profile.role === "reception" && (visit.status === "scheduled" || visit.status === "arrived") ? (visit.status === "scheduled" ? "arrive" : "depart") : null;
    return <div className="list-row" key={visit.id}><div className="time">{formatDateTime(visit.scheduled_start)}</div><div><div className="row-title">{profile.role === "reception" ? patient?.full_name || "Patient" : "Visite prévue"}</div><div className="row-meta">{visitors} · jusqu&apos;au {formatDateTime(visit.scheduled_end)}</div></div><span className="badge badge-info">{visitLabels[visit.status as VisitStatus]}</span>{action && <VisitMovementActions visitId={visit.id} action={action} />}</div>;
  };
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>{title}</h1><p>{profile.role === "patient" ? "Prévenez l’accueil directement depuis votre agenda." : "Enregistrez les entrées et départs réels des visiteurs."}</p></div></div>
    {profile.role === "patient" && <section className="card" style={{ marginBottom: 18 }}><div className="card-header"><div><h2>Prévenir l’accueil</h2><p className="card-subtitle">Règles de visite définies par {profile.facility.name}.</p></div></div><div className="card-body"><VisitForm startTime={startTime} endTime={endTime} maxDurationMinutes={maxDurationMinutes} maxVisitors={maxVisitors} maxPerDay={maxPerDay} /></div></section>}
    <section className="card"><div className="card-header"><div><h2>{profile.role === "patient" ? "Visites à venir" : "Visites prévues et en cours"}</h2><p className="card-subtitle">Les mouvements sont horodatés par l’accueil.</p></div></div><div className="card-body"><div className="list">{futureVisits.length ? futureVisits.map(renderRow) : <p className="empty">Aucune visite à venir.</p>}</div></div></section>
    {pastVisits.length > 0 && <section className="card" style={{ marginTop: 18 }}><div className="card-header"><div><h2>Historique</h2><p className="card-subtitle">Dernières visites enregistrées.</p></div></div><div className="card-body"><div className="list">{pastVisits.map(renderRow)}</div></div></section>}
  </PortalShell>;
}
