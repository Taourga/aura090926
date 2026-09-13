import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal-shell";
import { AdmissionActions, AdmissionForm, DischargeForm } from "@/components/stay-planning";
import { formatDateTime } from "@/lib/format";

export const dynamic="force-dynamic";
export default async function StaysPage(){
 const profile=await requireProfile(); if(!["reception","nurse","doctor","admin"].includes(profile.role))redirect("/portal");
 const supabase=await createClient();
 const [patients,stays,admissions]=await Promise.all([
  supabase.from("profiles").select("id,full_name").eq("role","patient").eq("active",true).order("full_name"),
  supabase.from("patient_stays").select("id,patient_id,room_number,started_at,planned_discharge_at,presence").is("ended_at",null).order("room_number"),
  supabase.from("planned_admissions").select("id,patient_id,room_number,expected_at").is("stay_id",null).is("cancelled_at",null).gte("expected_at",new Date().toISOString()).order("expected_at"),
 ]);
 if(patients.error||stays.error||admissions.error)return <PortalShell profile={profile}><h1>Séjours</h1><p role="alert">Chargement impossible.</p></PortalShell>;
 const name=(id:string)=>patients.data.find(p=>p.id===id)?.full_name||"Patient"; const canAdmit=["reception","admin"].includes(profile.role); const canDischarge=["doctor","nurse","admin"].includes(profile.role); const available=patients.data.filter(p=>!stays.data.some(s=>s.patient_id===p.id)&&!admissions.data.some(a=>a.patient_id===p.id)); const dt=(v:string)=>formatDateTime(v,profile.facility.locale,profile.facility.timezone);
 return <PortalShell profile={profile}>
  <div className="page-intro"><div><div className="section-kicker">Entrées & hospitalisations</div><h1>Séjours</h1><p>Trois informations seulement : qui arrive, qui est présent, qui sort bientôt.</p></div>{canAdmit&&<a className="button button-primary" href="#new-admission">+ Prévoir une entrée</a>}</div>
  <section className="stay-glance"><article><strong>{admissions.data.length}</strong><span>Entrées prévues</span></article><article><strong>{stays.data.length}</strong><span>Séjours actifs</span></article><article><strong>{stays.data.filter(s=>s.planned_discharge_at).length}</strong><span>Sorties prévues</span></article></section>
  <section className="card stay-focus-card"><div className="card-header"><div><h2>Prochaines entrées</h2><p className="card-subtitle">Ce que l’accueil doit anticiper.</p></div></div><div className="card-body"><div className="admission-preview-grid">{admissions.data.length?admissions.data.map(a=><article className="admission-preview" key={a.id}><span>Entrée prévue</span><strong>{name(a.patient_id)}</strong><small>{dt(a.expected_at)} · chambre {a.room_number}</small>{canAdmit&&<AdmissionActions id={a.id}/>}</article>):<p className="empty">Aucune entrée prévue.</p>}</div></div></section>
  <section className="card"><div className="card-header"><div><h2>Patients hospitalisés</h2><p className="card-subtitle">Les actions de sortie restent disponibles sans alourdir l’écran.</p></div></div><div className="card-body"><div className="stay-list">{stays.data.map(s=><article className="stay-row-simple" key={s.id}><div><strong>{name(s.patient_id)}</strong><small>Chambre {s.room_number||"—"} · entrée {dt(s.started_at)}</small></div><span className={s.presence==="out"?"badge badge-warning":"badge badge-success"}>{s.presence==="out"?"Sorti temporairement":"Présent"}</span><div className="stay-discharge-copy"><small>Sortie définitive</small><strong>{s.planned_discharge_at?dt(s.planned_discharge_at):"Non planifiée"}</strong></div>{canDischarge&&<details className="stay-action-details"><summary>Gérer</summary><DischargeForm key={`${s.id}-${s.planned_discharge_at}`} id={s.id} expected={s.planned_discharge_at}/></details>}</article>)}</div></div></section>
  {canAdmit&&<details className="card stay-new-admission" id="new-admission"><summary>Prévoir une autre entrée</summary><div className="card-body"><AdmissionForm patients={available}/>{!available.length&&<p className="form-help">Tous les profils patients de démonstration ont déjà un séjour ou une entrée planifiée.</p>}</div></details>}
 </PortalShell>;
}
