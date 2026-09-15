import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { AppointmentForm } from "@/components/appointment-form";
import { AttendanceActions } from "@/components/attendance-actions";
import { addPersonalPlanningEvent } from "@/app/portal/tassadite-actions";
import { requireProfile, appointmentRoles } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";
import { attendanceLabels, type AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
type TimelineKind="appointment"|"activity"|"doctor_round"|"permission"|"visit"|"personal";
type TimelineEvent={id:string;kind:TimelineKind;title:string;startsAt:string;endsAt:string;location?:string|null;detail?:string|null;status?:string|null};
type ActivityEnrollment={id:string;attendance_status:AttendanceStatus|null;activity:{id:string;title:string;starts_at:string;ends_at:string;location:string|null}|{id:string;title:string;starts_at:string;ends_at:string;location:string|null}[]|null};
type DoctorRound={id:string;scheduled_at:string;duration_minutes:number;floor_number:number;doctor:{full_name:string}|{full_name:string}[]|null};
const kindLabels:Record<TimelineKind,string>={appointment:"Rendez-vous",activity:"Activité",doctor_round:"Passage médecin",permission:"Permission",visit:"Visite",personal:"Personnel"};
const kindIcons:Record<TimelineKind,string>={appointment:"◷",activity:"✦",doctor_round:"⚕",permission:"✓",visit:"♧",personal:"＋"};
function eventEndFromMinutes(startsAt:string,minutes:number){return new Date(new Date(startsAt).getTime()+minutes*60_000).toISOString()}
function conflictNames(event:TimelineEvent,all:TimelineEvent[]){const start=new Date(event.startsAt).getTime(),end=new Date(event.endsAt).getTime();return all.filter(o=>o.id!==event.id&&start<new Date(o.endsAt).getTime()&&end>new Date(o.startsAt).getTime()).map(o=>o.title)}
function dayKey(value:string,timezone:string){return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value))}
function localToday(timezone:string){return dayKey(new Date().toISOString(),timezone)}
function addDay(key:string,amount=1){const d=new Date(`${key}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10)}

export default async function AppointmentsPage({searchParams}:{searchParams:Promise<{patient?:string}>}){
 const profile=await requireProfile();const {patient:requestedPatientId}=await searchParams;const supabase=await createClient();const now=new Date().toISOString();
 if(profile.role==="patient"){
  const [{data:appointments},{data:enrollments},{data:rounds},{data:permissions},{data:visits},{data:personalEvents}]=await Promise.all([
   supabase.from("appointments").select("id,title,starts_at,ends_at,location,notes,attendance_status").eq("patient_id",profile.id).gte("ends_at",now).order("starts_at").limit(50),
   supabase.from("activity_enrollments").select("id,attendance_status,activity:activities!inner(id,title,starts_at,ends_at,location)").eq("patient_id",profile.id).gte("activity.ends_at",now).limit(50),
   supabase.from("doctor_rounds").select("id,scheduled_at,duration_minutes,floor_number,doctor:profiles!doctor_rounds_doctor_id_fkey(full_name)").gte("scheduled_at",now).order("scheduled_at").limit(20),
   supabase.from("permission_requests").select("id,departure_at,return_at,status,reason").eq("patient_id",profile.id).in("status",["approved","departed"]).gte("return_at",now).order("departure_at").limit(30),
   supabase.from("visit_notifications").select("id,scheduled_start,scheduled_end,visitor_one_name,visitor_two_name,status").eq("patient_id",profile.id).neq("status","cancelled").gte("scheduled_end",now).order("scheduled_start").limit(30),
   supabase.from("patient_personal_events").select("id,title,starts_at,ends_at,location,notes").eq("patient_id",profile.id).gte("ends_at",now).order("starts_at").limit(50),
  ]);
  const appointmentEvents:TimelineEvent[]=(appointments||[]).map(i=>({id:`appointment-${i.id}`,kind:"appointment",title:i.title,startsAt:i.starts_at,endsAt:i.ends_at,location:i.location,detail:i.notes,status:attendanceLabels[i.attendance_status as AttendanceStatus]}));
  const activityEvents:TimelineEvent[]=((enrollments||[]) as ActivityEnrollment[]).flatMap(item=>{const a=Array.isArray(item.activity)?item.activity[0]:item.activity;if(!a)return[];return[{id:`activity-${item.id}`,kind:"activity",title:a.title,startsAt:a.starts_at,endsAt:a.ends_at,location:a.location,detail:"Vous êtes inscrit",status:item.attendance_status?attendanceLabels[item.attendance_status]:"Inscrit"}]});
  const roundEvents:TimelineEvent[]=((rounds||[]) as DoctorRound[]).map(i=>{const doctor=Array.isArray(i.doctor)?i.doctor[0]:i.doctor;return{id:`round-${i.id}`,kind:"doctor_round",title:"Passage du médecin",startsAt:i.scheduled_at,endsAt:eventEndFromMinutes(i.scheduled_at,i.duration_minutes||30),location:`Étage ${i.floor_number}`,detail:doctor?.full_name?doctor.full_name:"Médecin à confirmer",status:"Prévu"}});
  const permissionEvents:TimelineEvent[]=(permissions||[]).map(i=>({id:`permission-${i.id}`,kind:"permission",title:"Permission de sortie",startsAt:i.departure_at,endsAt:i.return_at,location:"Hors établissement",detail:i.reason||"Permission validée",status:i.status==="departed"?"En cours":"Validée"}));
  const visitEvents:TimelineEvent[]=(visits||[]).map(i=>({id:`visit-${i.id}`,kind:"visit",title:`Visite · ${i.visitor_one_name}`,startsAt:i.scheduled_start,endsAt:i.scheduled_end,location:"Accueil / chambre",detail:[i.visitor_one_name,i.visitor_two_name].filter(Boolean).join(" · "),status:i.status==="arrived"?"En cours":"Prévue"}));
  const personalTimeline:TimelineEvent[]=(personalEvents||[]).map(i=>({id:`personal-${i.id}`,kind:"personal",title:i.title,startsAt:i.starts_at,endsAt:i.ends_at,location:i.location,detail:i.notes,status:"Personnel"}));
  const timeline=[...appointmentEvents,...activityEvents,...roundEvents,...permissionEvents,...visitEvents,...personalTimeline].sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime());
  const conflicts=timeline.filter(e=>conflictNames(e,timeline).length>0).length;
  const today=localToday(profile.facility.timezone);
  const weekDays=Array.from({length:7},(_,index)=>addDay(today,index));
  const next=timeline[0];
  const dayLabel=(day:string)=>new Intl.DateTimeFormat(profile.facility.locale||"fr-FR",{weekday:"short",day:"numeric",month:"short",timeZone:profile.facility.timezone}).format(new Date(`${day}T12:00:00Z`));

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Ma semaine</div><h1>Mon planning</h1><p>Rendez-vous, activités, visites, permissions et événements personnels réunis dans un calendrier unique.</p></div>{next&&<div className="planning-next-pill"><span>Prochain</span><strong>{formatTime(next.startsAt,profile.facility.locale,profile.facility.timezone)} · {next.title}</strong></div>}</div>

    <section className="patient-week-calendar" aria-label="Calendrier des sept prochains jours">
      {weekDays.map((day,index)=>{const items=timeline.filter(e=>dayKey(e.startsAt,profile.facility.timezone)===day);return <article className={`patient-calendar-day${index===0?" is-today":""}`} key={day}><header><span>{index===0?"Aujourd’hui":dayLabel(day)}</span><strong>{new Intl.DateTimeFormat(profile.facility.locale||"fr-FR",{day:"2-digit",month:"2-digit",timeZone:profile.facility.timezone}).format(new Date(`${day}T12:00:00Z`))}</strong></header><div>{items.slice(0,4).map(item=><div className={`patient-calendar-event patient-calendar-event--${item.kind}`} key={item.id}><span>{kindIcons[item.kind]}</span><time>{formatTime(item.startsAt,profile.facility.locale,profile.facility.timezone)}</time><strong>{item.title}</strong></div>)}{!items.length&&<small>Rien de prévu</small>}{items.length>4&&<small>+ {items.length-4} autre{items.length-4>1?"s":""}</small>}</div></article>})}
    </section>

    <details className="card patient-add-planning"><summary>＋ Ajouter quelque chose à mon planning</summary><div className="card-body"><form action={addPersonalPlanningEvent}><div className="form-grid"><label className="field wide">Titre<input name="title" required maxLength={120} placeholder="Ex. appel famille, lecture, promenade" /></label><label className="field">Début<input name="startsAt" type="datetime-local" required /></label><label className="field">Fin<input name="endsAt" type="datetime-local" required /></label><label className="field">Lieu<input name="location" placeholder="Ex. chambre, jardin" /></label><label className="field wide">Note<textarea name="notes" rows={2} placeholder="Facultatif" /></label></div><button className="button button-primary">＋ Ajouter au calendrier</button></form></div></details>

    <nav className="planning-quick-actions"><Link href="/portal/activities">✦ Activités</Link><Link href="/portal/visits">♧ Ajouter une visite</Link><Link href="/portal/permissions">✓ Permissions</Link><Link href="/portal">⌂ Accueil</Link></nav>
    <section className="planning-summary compact-metrics"><div><span>À venir</span><strong>{timeline.length}</strong></div><div><span>Activités</span><strong>{activityEvents.length}</strong></div><div><span>Visites</span><strong>{visitEvents.length}</strong></div><div className={conflicts?"planning-summary-alert":""}><span>Chevauchements</span><strong>{conflicts}</strong></div></section>
    <section className="card"><div className="card-header"><div><h2>Chronologie</h2><p className="card-subtitle">Les chevauchements sont signalés automatiquement.</p></div></div><div className="card-body"><div className="planning-timeline">{timeline.length?timeline.map(event=>{const overlaps=conflictNames(event,timeline);return <div className={`planning-event planning-event--${event.kind}${overlaps.length?" planning-event--conflict":""}`} key={event.id}><div className="planning-event-time"><strong>{formatDateTime(event.startsAt,profile.facility.locale,profile.facility.timezone)}</strong><small>→ {formatTime(event.endsAt,profile.facility.locale,profile.facility.timezone)}</small></div><div className="planning-event-main"><div className="planning-event-title"><span className="planning-kind">{kindIcons[event.kind]} {kindLabels[event.kind]}</span><strong>{event.title}</strong></div><div className="row-meta">{event.location||"Lieu à confirmer"}{event.detail?` · ${event.detail}`:""}</div>{overlaps.length>0&&<div className="planning-conflict"><strong>⚠ Chevauchement</strong><span>Avec : {overlaps.join(" · ")}</span></div>}</div><span className={event.kind==="permission"?"badge badge-success":"badge badge-info"}>{event.status||"Prévu"}</span></div>}):<p className="empty">Aucun événement prévu.</p>}</div></div></section>
  </PortalShell>;
 }
 if(!appointmentRoles.includes(profile.role))redirect("/portal");
 const [{data:patients},{data:appointments},{data:externalAppointments}]=await Promise.all([
  supabase.from("profiles").select("id,full_name").eq("role","patient").eq("active",true).order("full_name"),
  supabase.from("appointments").select("id,patient_id,title,starts_at,ends_at,location,notes,creator_id,attendance_status,patient:profiles!appointments_patient_id_fkey(full_name)").gte("ends_at",now).order("starts_at").limit(80),
  profile.role==="doctor"?supabase.from("doctor_schedule_blocks").select("id,starts_at,ends_at").eq("doctor_id",profile.id).gte("ends_at",now).order("starts_at"):Promise.resolve({data:[]}),
 ]);
 const contextualPatient=requestedPatientId?(patients||[]).find(patient=>patient.id===requestedPatientId):undefined;
 const visibleAppointments=contextualPatient?(appointments||[]).filter(item=>item.patient_id===contextualPatient.id):(appointments||[]);
 return <PortalShell profile={profile}><div className="page-intro"><div><h1>{contextualPatient?`Planning · ${contextualPatient.full_name}`:"Planning des patients"}</h1><p>{contextualPatient?"Le planning est filtré sur ce patient et le formulaire est déjà prérempli.":"Les prochains rendez-vous et la création de créneaux au même endroit."}</p></div>{contextualPatient&&profile.role==="doctor"&&<div className="page-intro-actions"><Link className="button button-secondary" href={`/portal/patients?patient=${contextualPatient.id}`}>← Fiche patient</Link></div>}</div><div className="dashboard-grid"><section className="card"><div className="card-header"><h2>{contextualPatient?"Rendez-vous du patient":"Rendez-vous à venir"}</h2></div><div className="card-body"><div className="list">{visibleAppointments.length?visibleAppointments.map(item=>{const patient=Array.isArray(item.patient)?item.patient[0]:item.patient;const canMark=item.creator_id===profile.id||profile.role==="admin";return <div className="list-row" key={item.id}><div className="time">{formatDateTime(item.starts_at,profile.facility.locale,profile.facility.timezone)}</div><div><div className="row-title">{item.title}</div><div className="row-meta">{patient?.full_name||"Patient"} · {item.location||"Lieu à confirmer"}</div></div><span className="badge badge-info">{attendanceLabels[item.attendance_status as AttendanceStatus]}</span>{canMark&&<AttendanceActions kind="appointment" recordId={item.id}/>}</div>}):<p className="empty">Aucun rendez-vous à venir{contextualPatient?" pour ce patient":""}.</p>}</div>{profile.role==="doctor"&&!contextualPatient&&externalAppointments?.length?<details className="history-details"><summary>Créneaux externes ({externalAppointments.length})</summary>{externalAppointments.map(item=><div className="timeline-row timeline-row--external" key={item.id}><time>{formatDateTime(item.starts_at)}</time><div><strong>RDV externe</strong><small>Créneau réservé</small></div></div>)}</details>:null}</div></section><aside className="card"><div className="card-header"><h2>Nouveau rendez-vous</h2></div><div className="card-body"><AppointmentForm patients={patients||[]} initialPatientId={contextualPatient?.id}/></div></aside></div></PortalShell>;
}
