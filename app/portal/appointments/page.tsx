import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { AppointmentForm } from "@/components/appointment-form";
import { requireProfile, appointmentRoles } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const profile = await requireProfile();
  if (!appointmentRoles.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();
  const [{ data: patients }, { data: appointments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "patient").eq("active", true).order("full_name"),
    supabase.from("appointments").select("id, title, starts_at, ends_at, location, notes, patient:profiles!appointments_patient_id_fkey(full_name)").gte("ends_at", new Date().toISOString()).order("starts_at").limit(80),
  ]);
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Planning des patients</h1><p>Ajoutez des rendez-vous visibles immédiatement dans le planning du patient.</p></div></div>
    <div className="dashboard-grid"><section className="card"><div className="card-header"><div><h2>Rendez-vous à venir</h2><p className="card-subtitle">Liste de votre périmètre de consultation.</p></div></div><div className="card-body"><div className="list">{appointments?.length ? appointments.map((item) => { const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient; return <div className="list-row" key={item.id}><div className="time">{formatDateTime(item.starts_at)}</div><div><div className="row-title">{item.title}</div><div className="row-meta">{patient?.full_name || "Patient"} · {item.location || "Lieu à confirmer"}{item.notes ? ` · ${item.notes}` : ""}</div></div><span className="badge badge-info">Prévu</span></div>; }) : <p className="empty">Aucun rendez-vous à venir.</p>}</div></div></section><aside className="card"><div className="card-header"><div><h2>Nouveau rendez-vous</h2><p className="card-subtitle">Les champs marqués sont obligatoires.</p></div></div><div className="card-body"><AppointmentForm patients={patients || []} /></div></aside></div>
  </PortalShell>;
}
