import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { VisitMovementActions } from "@/components/visit-actions";
import { VisitCalendar } from "@/components/visit-calendar";
import { facilitySettingNumber, facilitySettingText, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { visitLabels, type VisitStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const profile = await requireProfile();
  if (profile.role !== "patient" && profile.role !== "reception") redirect("/portal");
  const { patient: requestedPatientId } = await searchParams;
  const supabase = await createClient();
  const startTime = facilitySettingText(profile, "visits.start_time", "13:00");
  const endTime = facilitySettingText(profile, "visits.end_time", "17:00");
  const maxDurationMinutes = facilitySettingNumber(profile, "visits.max_duration_minutes", 60);
  const maxVisitors = facilitySettingNumber(profile, "visits.max_visitors", 2);
  const maxPerDay = facilitySettingNumber(profile, "visits.max_per_day", 1);
  const displayDateTime = (value: string | null | undefined) => formatDateTime(value, profile.facility.locale, profile.facility.timezone);
  let query = supabase.from("visit_notifications").select("id,patient_id,scheduled_start,scheduled_end,visitor_one_name,visitor_two_name,status,arrived_at,departed_at,patient:profiles!visit_notifications_patient_id_fkey(full_name)").order("scheduled_start", { ascending: false }).limit(100);
  if (profile.role === "patient") query = query.eq("patient_id", profile.id);
  else if (requestedPatientId) query = query.eq("patient_id", requestedPatientId);
  const { data: visits } = await query;
  let selectedPatientName: string | null = null;
  if (profile.role === "reception" && requestedPatientId) {
    const firstPatient = visits?.[0]?.patient;
    const patient = Array.isArray(firstPatient) ? firstPatient[0] : firstPatient;
    selectedPatientName = patient?.full_name || null;
    if (!selectedPatientName) {
      const { data: selectedPatient } = await supabase.from("profiles").select("full_name").eq("id", requestedPatientId).eq("role", "patient").maybeSingle();
      selectedPatientName = selectedPatient?.full_name || "Patient sélectionné";
    }
  }
  const futureVisits = (visits || []).filter((visit) => new Date(visit.scheduled_end) >= new Date() || visit.status === "arrived");
  const pastVisits = (visits || []).filter((visit) => !futureVisits.includes(visit));
  const renderRow = (visit: NonNullable<typeof visits>[number]) => { const patient=Array.isArray(visit.patient)?visit.patient[0]:visit.patient; const visitors=[visit.visitor_one_name,visit.visitor_two_name].filter(Boolean).join(" · "); const action=profile.role==="reception"&&(visit.status==="scheduled"||visit.status==="arrived")?(visit.status==="scheduled"?"arrive":"depart"):null; return <div className="list-row" key={visit.id}><div className="time">{displayDateTime(visit.scheduled_start)}</div><div><div className="row-title">{profile.role==="reception"?<Link href={`/portal/visits?patient=${visit.patient_id}`}>{patient?.full_name||"Patient"}</Link>:"Visite prévue"}</div><div className="row-meta">{visitors} · jusqu&apos;au {displayDateTime(visit.scheduled_end)}</div></div><span className="badge badge-info">{visitLabels[visit.status as VisitStatus]}</span>{action&&<VisitMovementActions visitId={visit.id} action={action}/>}</div>; };
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Visiteurs</div><h1>{profile.role==="patient"?"Mes visites":selectedPatientName?`Visites · ${selectedPatientName}`:"Visiteurs attendus"}</h1><p>{profile.role==="patient"?"Choisissez un jour, renseignez votre visiteur et l’accueil est prévenu.":selectedPatientName?"Les visites de ce patient sont regroupées ici.":"Les arrivées et départs se traitent en un clic."}</p></div>{profile.role==="reception"&&requestedPatientId&&<div className="page-intro-actions"><Link className="button button-secondary" href="/portal/visits">Toutes les visites</Link></div>}</div>
    {profile.role==="patient"&&<VisitCalendar visits={(visits||[]).map(v=>({id:v.id,scheduled_start:v.scheduled_start,scheduled_end:v.scheduled_end,visitor_one_name:v.visitor_one_name,visitor_two_name:v.visitor_two_name,status:v.status}))} locale={profile.facility.locale||"fr-FR"} timezone={profile.facility.timezone} startTime={startTime} endTime={endTime} maxDurationMinutes={maxDurationMinutes} maxVisitors={maxVisitors} maxPerDay={maxPerDay}/>} 
    <section className="card"><div className="card-header"><div><h2>{profile.role==="patient"?"Mes prochaines visites":selectedPatientName?"Prochaines visites":"À accueillir"}</h2><p className="card-subtitle">Seulement les informations utiles.</p></div></div><div className="card-body"><div className="list">{futureVisits.length?futureVisits.map(renderRow):<p className="empty">Aucune visite à venir.</p>}</div></div></section>
    {pastVisits.length>0&&<details className="history-details"><summary>Voir l’historique ({pastVisits.length})</summary><section className="card"><div className="card-body"><div className="list">{pastVisits.map(renderRow)}</div></div></section></details>}
  </PortalShell>;
}
