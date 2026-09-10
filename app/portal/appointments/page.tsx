import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { AppointmentForm } from "@/components/appointment-form";
import { requireProfile, appointmentRoles } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (profile.role === "patient") {
    const { data: appointments } = await supabase.from("appointments").select("id, title, starts_at, ends_at, location, notes").eq("patient_id", profile.id).gte("ends_at", new Date().toISOString()).order("starts_at").limit(50);
    return <PortalShell profile={profile}>
      <div className="page-intro"><div><h1>Mon planning</h1><p>Vos rendez-vous à venir pendant le séjour.</p></div></div>
      <section className="card"><div className="card-header"><div><h2>Rendez-vous</h2><p className="card-subtitle">Les modifications sont communiquées par le portail.</p></div></div><div className="card-body"><div className="list">{appointments?.length ? appointments.map((item) => <div className="list-row" key={item.id}><div className="time">{formatDateTime(item.starts_at)}</div><div><div className="row-title">{item.title}</div><div className="row-meta">{item.location || "Lieu à confirmer"}{item.notes ? ` · ${item.notes}` : ""}</div></div><span className="badge badge-info">Prévu</span></div>) : <p className="empty">Aucun rendez-vous n’est planifié pour le moment.</p>}</div></div></section>
    </PortalShell>;
  }

  if (!appointmentRoles.includes(profile.role)) redirect("/portal");
  const [{ data: patients }, { data: appointments }, { data: externalAppointments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "patient").eq("active", true).order("full_name"),
    supabase.from("appointments").select("id, title, starts_at, ends_at, location, notes, patient:profiles!appointments_patient_id_fkey(full_name)").gte("ends_at", new Date().toISOString()).order("starts_at").limit(80),
    profile.role === "doctor" ? supabase.from("doctor_schedule_blocks").select("id, starts_at, ends_at").eq("doctor_id", profile.id).gte("ends_at", new Date().toISOString()).order("starts_at") : Promise.resolve({ data: [] }),
  ]);
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Planning des patients</h1><p>Ajoutez des rendez-vous visibles immédiatement dans le planning du patient.</p></div></div>
    <div className="dashboard-grid"><section className="card"><div className="card-header"><div><h2>Rendez-vous à venir</h2><p className="card-subtitle">Liste de votre périmètre de consultation.</p></div></div><div className="card-body"><div className="list">{appointments?.length ? appointments.map((item) => { const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient; return <div className="list-row" key={item.id}><div className="time">{formatDateTime(item.starts_at)}</div><div><div className="row-title">{item.title}</div><div className="row-meta">{patient?.full_name || "Patient"} · {item.location || "Lieu à confirmer"}{item.notes ? ` · ${item.notes}` : ""}</div></div><span className="badge badge-info">Prévu</span></div>; }) : <p className="empty">Aucun rendez-vous à venir.</p>}</div>{profile.role === "doctor" && <div className="external-appointments"><div className="external-appointments-head"><div><p className="section-kicker">Créneaux privés</p><h2>RDV externes</h2></div><span>Sans détail patient</span></div>{externalAppointments?.length ? externalAppointments.map((item) => <div className="timeline-row timeline-row--external" key={item.id}><time>{formatDateTime(item.starts_at)}</time><div><strong>RDV externe</strong><small>Créneau réservé jusqu&apos;au {formatDateTime(item.ends_at)}</small></div></div>) : <p className="empty">Aucun créneau externe à venir.</p>}</div>}</div></section><aside className="card"><div className="card-header"><div><h2>Nouveau rendez-vous</h2><p className="card-subtitle">Les champs marqués sont obligatoires.</p></div></div><div className="card-body"><AppointmentForm patients={patients || []} /></div></aside></div>
  </PortalShell>;
}
