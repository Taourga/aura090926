import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { DoctorAbsenceForm } from "@/components/doctor-schedule-tools";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DoctorAvailabilityPage() {
  const profile = await requireProfile();
  if (profile.role !== "doctor") redirect("/portal");
  const supabase = await createClient();
  const { data: doctors } = await supabase.from("care_team_directory").select("id,full_name,user_id").eq("member_type", "doctor").eq("active", true).order("full_name");
  const me = doctors?.find((item) => item.user_id === profile.id);
  const { data: absences } = me ? await supabase.from("doctor_absences").select("id,starts_at,ends_at,reason,replacement:care_team_directory!doctor_absences_replacement_doctor_id_fkey(full_name)").eq("doctor_id", me.id).gte("ends_at", new Date().toISOString()).order("starts_at") : { data: [] };
  const replacements = (doctors || []).filter((item) => item.id !== me?.id).map((item) => ({ id: item.id, full_name: item.full_name }));
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Continuité du suivi</div><h1>Mes absences & relais</h1><p>Prévenez suffisamment tôt pour que les patients sachent qui assure le relais.</p></div></div>
    <div className="dashboard-grid">
      <section className="card"><div className="card-header"><div><h2>Absences à venir</h2><p className="card-subtitle">Les patients rattachés sont informés depuis leur accueil AURA.</p></div></div><div className="card-body">{absences?.length ? absences.map((item) => { const replacement = Array.isArray(item.replacement) ? item.replacement[0] : item.replacement; return <div className="record-row" key={item.id}><div><strong>{formatDateTime(item.starts_at)} → {formatDateTime(item.ends_at)}</strong><small>{item.reason || "Absence planifiée"}{replacement?.full_name ? ` · Relais : ${replacement.full_name}` : " · Relais à définir"}</small></div><span className="badge badge-warning">Planifiée</span></div>; }) : <p className="empty">Aucune absence planifiée.</p>}</div></section>
      <aside className="card"><div className="card-header"><div><h2>Déclarer une absence</h2><p className="card-subtitle">Choisissez si possible un médecin relais.</p></div></div><div className="card-body"><DoctorAbsenceForm doctors={replacements} /></div></aside>
    </div>
  </PortalShell>;
}
