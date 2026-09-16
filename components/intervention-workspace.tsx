"use client";

import { FormEvent, useEffect, useState } from "react";

type Session={id:string;starts_at:string;ends_at:string;location?:string|null};
type Prescription={id:string;notes?:string|null;patient_id?:string|null;service?:{title?:string;default_location?:string}|{title?:string;default_location?:string}[]|null;patient?:{full_name?:string}|{full_name?:string}[]|null;roster?:{display_name?:string;room_number?:string}|{display_name?:string;room_number?:string}[]|null;sessions?:Session[]|null};
type Payload={role:string;directory?:{full_name:string;specialty?:string|null}|null;prescriptions?:Prescription[]};
const one=<T,>(v:T|T[]|null|undefined)=>Array.isArray(v)?v[0]:v;

export function InterventionWorkspace(){
  const [data,setData]=useState<Payload|null>(null);const [message,setMessage]=useState("");const [loading,setLoading]=useState("");
  async function load(){const r=await fetch("/api/prescriptions",{cache:"no-store"});if(r.ok)setData(await r.json());}
  useEffect(()=>{load();},[]);
  async function schedule(e:FormEvent<HTMLFormElement>,prescriptionId:string){e.preventDefault();setLoading(prescriptionId);setMessage("");const fd=new FormData(e.currentTarget);const r=await fetch("/api/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"schedule",prescriptionId,startsAt:fd.get("startsAt"),endsAt:fd.get("endsAt"),location:fd.get("location"),notes:fd.get("notes")})});const reply=await r.json();setMessage(reply.success||reply.error||"");setLoading("");if(r.ok){e.currentTarget.reset();await load();}}
  if(!data)return <p>Chargement…</p>;
  const list=data.prescriptions||[];
  return <div className="intervention-workspace">
    <section className="intervention-hero"><div><span className="section-kicker">Espace intervenant</span><h1>{data.directory?.specialty||"Mes activités prescrites"}</h1><p>{data.directory?.full_name||"Intervenant"} · patients adressés par l’équipe médicale.</p></div><div className="intervention-metric"><strong>{list.length}</strong><span>prescription{list.length>1?"s":""} active{list.length>1?"s":""}</span></div></section>
    {message&&<p className="form-success">{message}</p>}
    <section className="intervention-grid">{list.length?list.map(p=>{const service=one(p.service),patient=one(p.patient),roster=one(p.roster);const patientName=patient?.full_name||roster?.display_name||"Patient";return <article className="intervention-card" key={p.id}><header><div><span className="badge badge-warning">Sur prescription</span><h2>{patientName}</h2><small>{service?.title||"Activité"}{roster?.room_number?` · Chambre ${roster.room_number}`:""}</small></div></header>{p.notes&&<p className="intervention-note">Consigne médicale · {p.notes}</p>}<div className="intervention-sessions">{(p.sessions||[]).length?(p.sessions||[]).map(s=><div key={s.id}><strong>{new Date(s.starts_at).toLocaleString("fr-FR")}</strong><span>{s.location||"Lieu à confirmer"}</span></div>):<span>Aucune séance programmée.</span>}</div><form onSubmit={(e)=>schedule(e,p.id)} className="intervention-schedule-form"><label>Début<input name="startsAt" type="datetime-local" required/></label><label>Fin<input name="endsAt" type="datetime-local" required/></label><label>Lieu<input name="location" defaultValue={service?.default_location||""}/></label><label className="wide">Note<input name="notes" placeholder="Information visible au patient"/></label><button className="button button-primary" disabled={loading===p.id}>{loading===p.id?"Ajout…":"Ajouter au planning du patient"}</button></form></article>}):<section className="card"><div className="card-body"><p className="empty">Aucun patient avec prescription pour le moment.</p></div></section>}</section>
  </div>;
}
