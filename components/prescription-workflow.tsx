"use client";

import { createPortal } from "react-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Service={id:string;title:string;description?:string|null;default_location?:string|null;clinician?:{full_name?:string;specialty?:string}|{full_name?:string;specialty?:string}[]|null};
type Session={id:string;starts_at:string;ends_at:string;location?:string|null;notes?:string|null};
type Prescription={id:string;status:string;notes?:string|null;created_at:string;service?:{title?:string;code?:string;default_location?:string}|{title?:string;code?:string;default_location?:string}[]|null;clinician?:{full_name?:string;specialty?:string}|{full_name?:string;specialty?:string}[]|null;sessions?:Session[]|null};
type Payload={role:string;services?:Service[];prescriptions?:Prescription[];patient?:{name:string}};
const one=<T,>(v:T|T[]|null|undefined)=>Array.isArray(v)?v[0]:v;

export function PrescriptionWorkflow(){
  const pathname=usePathname();
  const params=useSearchParams();
  const router=useRouter();
  const patientKey=params.get("patient");
  const [payload,setPayload]=useState<Payload|null>(null);
  const [slot,setSlot]=useState<HTMLElement|null>(null);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const relevant=pathname==="/portal/patients"||pathname==="/portal/activities";

  async function load(){
    if(!relevant)return;
    const url=pathname==="/portal/patients"&&patientKey?`/api/prescriptions?patient=${encodeURIComponent(patientKey)}`:"/api/prescriptions";
    const res=await fetch(url,{cache:"no-store"});
    if(res.ok)setPayload(await res.json());
  }

  useEffect(()=>{load();},[pathname,patientKey]);

  useEffect(()=>{
    if(pathname!=="/portal/patients")return;
    const list=document.querySelector<HTMLElement>(".doctor-simple-list");
    const current=patientKey;
    document.querySelectorAll<HTMLAnchorElement>(".doctor-simple-patient").forEach(link=>{
      try{const u=new URL(link.href,location.origin);link.classList.toggle("selected-patient",u.searchParams.get("patient")===current);}catch{}
    });
    const onClick=(event:MouseEvent)=>{
      const target=(event.target as HTMLElement).closest<HTMLAnchorElement>(".doctor-simple-patient");
      if(!target||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      sessionStorage.setItem("aura-patient-window-scroll",String(window.scrollY));
      sessionStorage.setItem("aura-patient-list-scroll",String(list?.scrollTop||0));
      router.push(target.getAttribute("href")||target.href,{scroll:false});
    };
    list?.addEventListener("click",onClick);
    requestAnimationFrame(()=>{
      const y=Number(sessionStorage.getItem("aura-patient-window-scroll")||window.scrollY);
      const ly=Number(sessionStorage.getItem("aura-patient-list-scroll")||0);
      window.scrollTo({top:y,behavior:"auto"});
      if(list)list.scrollTop=ly;
    });
    return()=>list?.removeEventListener("click",onClick);
  },[pathname,patientKey,router]);

  useEffect(()=>{
    if(!relevant)return;
    const id=pathname==="/portal/patients"?"aura-patient-prescriptions-slot":"aura-my-prescriptions-slot";
    let node=document.getElementById(id) as HTMLElement|null;
    if(!node){
      node=document.createElement("div");node.id=id;
      if(pathname==="/portal/patients"){
        const grid=document.querySelector(".doctor-simple-grid");grid?.appendChild(node);
      }else{
        const tabs=document.querySelector(".section-tabs");tabs?.insertAdjacentElement("afterend",node);
      }
    }
    setSlot(node);
    return()=>{setSlot(null);};
  },[pathname,relevant,patientKey]);

  const prescriptions=payload?.prescriptions||[];
  const services=payload?.services||[];
  const canPrescribe=pathname==="/portal/patients"&&payload?.role==="doctor"&&!!patientKey;
  const readOnly=pathname==="/portal/patients"&&payload?.role==="nurse";
  const patientView=pathname==="/portal/activities"&&payload?.role==="patient";

  async function prescribe(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!patientKey)return;
    setLoading(true);setMessage("");const fd=new FormData(e.currentTarget);
    const res=await fetch("/api/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"prescribe",patientKey,serviceId:fd.get("serviceId"),notes:fd.get("notes")})});
    const data=await res.json();setMessage(data.success||data.error||"");setLoading(false);if(res.ok){e.currentTarget.reset();await load();}
  }

  const content=useMemo(()=>{
    if(!payload)return <section className="prescription-panel"><span>Chargement des prescriptions…</span></section>;
    if(pathname==="/portal/patients")return <section className="doctor-simple-card prescription-panel">
      <div className="doctor-simple-card-head"><div><h3>Activités prescrites</h3><small>{readOnly?"Consultation uniquement":"Prescription et suivi"}</small></div><span className="badge badge-info">{prescriptions.length}</span></div>
      {message&&<p className="prescription-feedback">{message}</p>}
      {canPrescribe&&<form className="prescription-form" onSubmit={prescribe}><select name="serviceId" required defaultValue=""><option value="" disabled>Choisir une activité</option>{services.map(s=>{const c=one(s.clinician);return <option value={s.id} key={s.id}>{s.title}{c?.full_name?` · ${c.full_name}`:""}</option>})}</select><input name="notes" placeholder="Consigne médicale (facultatif)"/><button className="button button-primary button-small" disabled={loading}>{loading?"Prescription…":"+ Prescrire"}</button></form>}
      <div className="prescription-list">{prescriptions.length?prescriptions.map(p=>{const s=one(p.service);const c=one(p.clinician);return <article key={p.id}><div><strong>{s?.title||"Activité prescrite"}</strong><span>{c?.full_name||"Intervenant à confirmer"}{c?.specialty?` · ${c.specialty}`:""}</span>{p.notes&&<small>{p.notes}</small>}</div><span className="badge badge-success">Prescrite</span>{(p.sessions||[]).map(sess=><small className="prescription-session" key={sess.id}>Séance · {new Date(sess.starts_at).toLocaleString("fr-FR")} · {sess.location||"Lieu à confirmer"}</small>)}</article>}):<p className="empty">Aucune activité prescrite.</p>}</div>
    </section>;
    if(patientView)return <section className="patient-prescriptions"><div><span className="section-kicker">Sur prescription</span><h2>Mes activités prescrites</h2><p>Retrouvez ici les activités prescrites par votre médecin et les séances ajoutées par les intervenants.</p></div><div className="patient-prescription-grid">{prescriptions.length?prescriptions.map(p=>{const s=one(p.service),c=one(p.clinician);return <article key={p.id}><strong>{s?.title||"Activité"}</strong><span>Intervenant · {c?.full_name||"À confirmer"}</span>{p.notes&&<small>{p.notes}</small>}{(p.sessions||[]).length?<div>{(p.sessions||[]).map(sess=><small key={sess.id}>◷ {new Date(sess.starts_at).toLocaleString("fr-FR")} · {sess.location||"Lieu à confirmer"}</small>)}</div>:<em>Séance à programmer</em>}</article>}):<p className="empty">Aucune activité prescrite pour le moment.</p>}</div></section>;
    return null;
  },[payload,pathname,patientKey,message,loading,canPrescribe,readOnly,patientView,prescriptions,services]);

  if(!slot||!content)return null;
  return createPortal(content,slot);
}
