import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal-shell";
import { AdmissionActions, AdmissionForm, DischargeForm } from "@/components/stay-planning";
import { parisDateTime } from "@/lib/housekeeping";

export const dynamic = "force-dynamic";
export default async function StaysPage() {
  const profile = await requireProfile();
  if (!["reception", "nurse", "doctor", "admin"].includes(profile.role)) redirect("/portal");
  const supabase = await createClient();
  const [patients, stays, admissions] = await Promise.all([
    supabase.from("profiles").select("id,full_name").eq("role", "patient").eq("active", true).order("full_name"),
    supabase.from("patient_stays").select("id,patient_id,room_number,started_at,planned_discharge_at").is("ended_at", null).order("room_number"),
    supabase.from("planned_admissions").select("id,patient_id,room_number,expected_at").is("stay_id", null).is("cancelled_at", null).order("expected_at"),
  ]);
  if (patients.error || stays.error || admissions.error) return <PortalShell profile={profile}><h1>Entrées & sorties</h1><p role="alert">Chargement impossible. Réessayez ou contactez l’administrateur.</p></PortalShell>;
  const name = (id: string) => patients.data.find(p => p.id === id)?.full_name || "Patient";
  const canAdmit = ["reception", "admin"].includes(profile.role);
  const canDischarge = ["doctor", "nurse", "admin"].includes(profile.role);
  const availablePatients = patients.data.filter(p => !stays.data.some(s => s.patient_id === p.id) && !admissions.data.some(a => a.patient_id === p.id));
  return <PortalShell profile={profile}><div className="page-intro"><div><h1>Entrées & sorties définitives</h1><p>L’accueil gère les admissions. Médecins et infirmiers renseignent les prévisions de sortie et la fin réelle d’hospitalisation.</p></div></div>
    {canAdmit && <section className="card"><div className="card-header"><h2>Prévoir une première entrée</h2></div><div className="card-body"><AdmissionForm patients={availablePatients} /></div></section>}
    <section className="card"><div className="card-header"><h2>Entrées prévues</h2></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Chambre</th><th>Entrée prévue</th><th>Action</th></tr></thead><tbody>{admissions.data.map(a => <tr key={a.id}><td>{name(a.patient_id)}</td><td>{a.room_number}</td><td>{parisDateTime(a.expected_at)}</td><td>{canAdmit ? <AdmissionActions id={a.id} /> : "Gestion par les admissions"}</td></tr>)}{!admissions.data.length && <tr><td colSpan={4} className="empty">Aucune première entrée prévue.</td></tr>}</tbody></table></div></section>
    <section className="card"><div className="card-header"><div><h2>Séjours et sorties définitives</h2><p className="card-subtitle">La prévision est partagée avec les équipes opérationnelles pour anticiper chambre, repas et logistique.</p></div></div><div className="card-body data-table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Chambre</th><th>Entrée réelle</th><th>Sortie définitive prévue</th></tr></thead><tbody>{stays.data.map(s => <tr key={s.id}><td>{name(s.patient_id)}</td><td>{s.room_number || "Non affectée"}</td><td>{parisDateTime(s.started_at)}</td><td>{canDischarge ? <DischargeForm key={`${s.id}-${s.planned_discharge_at}`} id={s.id} expected={s.planned_discharge_at} /> : s.planned_discharge_at ? parisDateTime(s.planned_discharge_at) : "Non renseignée"}</td></tr>)}{!stays.data.length && <tr><td colSpan={4} className="empty">Aucun séjour actif.</td></tr>}</tbody></table></div></section>
  </PortalShell>;
}
