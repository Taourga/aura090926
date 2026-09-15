"use client";

import { useMemo, useState } from "react";
import { VisitForm } from "@/components/visit-form";

type Visit = { id: string; scheduled_start: string; scheduled_end: string; visitor_one_name: string; visitor_two_name: string | null; status: string };
const pad = (n:number)=>String(n).padStart(2,"0");
function keyOf(value:string, timezone:string){return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));}
function monthDays(year:number, month:number){const first=new Date(Date.UTC(year,month,1));const count=new Date(Date.UTC(year,month+1,0)).getUTCDate();const offset=(first.getUTCDay()+6)%7;return Array.from({length:offset+count},(_,i)=>i<offset?null:i-offset+1);}

export function VisitCalendar({ visits, locale, timezone, startTime, endTime, maxDurationMinutes, maxVisitors, maxPerDay }: { visits: Visit[]; locale:string; timezone:string; startTime:string; endTime:string; maxDurationMinutes:number; maxVisitors:number; maxPerDay:number }) {
  const [selected,setSelected]=useState<string|null>(null);
  const now=new Date();
  const months=[{year:now.getFullYear(),month:now.getMonth()},{year:now.getMonth()===11?now.getFullYear()+1:now.getFullYear(),month:(now.getMonth()+1)%12}];
  const visible=useMemo(()=>visits.filter(v=>!["cancelled"].includes(v.status)),[visits]);
  const monthLabel=(y:number,m:number)=>new Intl.DateTimeFormat(locale||"fr-FR",{month:"long",year:"numeric"}).format(new Date(y,m,1));
  const eventsFor=(key:string)=>visible.filter(v=>keyOf(v.scheduled_start,timezone)===key);
  const timeOf=(value:string)=>new Intl.DateTimeFormat(locale||"fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:timezone}).format(new Date(value));
  const suggestedDate=keyOf(new Date(Date.now()+86400000).toISOString(),timezone);
  return <>
    <section className="card visit-calendar-card"><div className="card-header"><div><h2>Calendrier de mes visites</h2><p className="card-subtitle">Ajoutez une visite : l’heure et le nom du visiteur apparaîtront automatiquement dans votre calendrier et votre planning.</p></div><div className="visit-calendar-actions"><button type="button" className="button button-primary button-small" onClick={()=>setSelected(suggestedDate)}>＋ Ajouter une visite</button><div className="visit-legend"><span><i className="visit-dot visit-dot--scheduled"/>Prévue</span><span><i className="visit-dot visit-dot--arrived"/>En cours</span></div></div></div>
      <div className="card-body visit-months">{months.map(({year,month})=><section className="visit-month" key={`${year}-${month}`}><header><strong>{monthLabel(year,month)}</strong></header><div className="permission-weekdays">{["L","M","M","J","V","S","D"].map((d,i)=><span key={`${d}-${i}`}>{d}</span>)}</div><div className="permission-calendar">{monthDays(year,month).map((day,index)=>{if(!day)return <span className="permission-day permission-day--empty" key={`e-${index}`}/>;const key=`${year}-${pad(month+1)}-${pad(day)}`;const events=eventsFor(key);const past=new Date(`${key}T23:59:59`).getTime()<Date.now();return <button key={key} className={`permission-day permission-day--button visit-day${events.length?" visit-day--has-event":""}`} disabled={past&&!events.length} onClick={()=>!past&&setSelected(key)}><strong>{day}</strong>{events.slice(0,2).map(v=><small key={v.id}>{timeOf(v.scheduled_start)} · {v.visitor_one_name}</small>)}{!events.length&&!past&&<small className="permission-day-hint">＋ visite</small>}</button>;})}</div></section>)}</div>
    </section>
    {selected&&<div className="permission-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setSelected(null)}}><section className="permission-modal" role="dialog" aria-modal="true"><div className="permission-modal-head"><div><span className="section-kicker">Ajouter une visite</span><h2>{new Intl.DateTimeFormat(locale||"fr-FR",{day:"numeric",month:"long"}).format(new Date(`${selected}T12:00:00`))}</h2></div><button type="button" className="permission-modal-close" onClick={()=>setSelected(null)}>×</button></div><VisitForm startTime={startTime} endTime={endTime} maxDurationMinutes={maxDurationMinutes} maxVisitors={maxVisitors} maxPerDay={maxPerDay} initialDate={selected}/></section></div>}
  </>;
}
