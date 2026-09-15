import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { ActivityButton } from "@/components/activity-button";
import { ActivityForm } from "@/components/activity-form";
import { SportRoomScheduleForm } from "@/components/sport-room-form";
import { AttendanceActions } from "@/components/attendance-actions";
import { ActivityUpdateForm } from "@/components/activity-update-form";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { attendanceLabels, type AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
type FreeSchedule={schedule_date:string;opens_at:string;closes_at:string;note:string|null};
type Directory={id:string;full_name:string;member_type:string;specialty:string|null;user_id:string|null};
type Facilitator={activity_id:string;clinician_id:string;is_primary:boolean};
type Update={activity_id:string;update_type:string;message:string;created_at:string};
function localDateKey(date:Date,timezone:string){return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(date)}
function addDays(key:string,amount:number){const date=new Date(`${key}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10)}
function displayTime(value:string){return value.slice(0,5).replace(":"," h ")}

export default async function ActivitiesPage({searchParams}:{searchParams:Promise<{section?:string}>}){
  const {section}=await searchParams;
  const showFree=section==="free";
  const showPrescribed=section==="prescribed";
  const profile=await requireProfile();
  const supabase=await createClient();
  const startDate=localDateKey(new Date(),profile.facility.timezone);
  const endDate=addDays(startDate,6);
  const [{data:activities},{data:enrollments},{data:enrollmentCounts},{data:freeData},{data:facilitatorRows},{data:directoryRows},{data:updateRows}]=await Promise.all([
    supabase.from("activities").select("id,title,description,starts_at,ends_at,location,capacity,active,requires_prescription").eq("active",true).gte("ends_at",new Date().toISOString()).order("starts_at").limit(40),
    supabase.from("activity_enrollments").select("id,activity_id,patient_id,attendance_status,patient:profiles!activity_enrollments_patient_id_fkey(full_name)"),
    supabase.rpc("activity_enrollment_counts"),
    supabase.from("sport_room_schedules").select("schedule_date,opens_at,closes_at,note").gte("schedule_date",startDate).lte("schedule_date",endDate).order("schedule_date"),
    supabase.from("activity_facilitators").select("activity_id,clinician_id,is_primary"),
    supabase.from("care_team_directory").select("id,full_name,member_type,specialty,user_id").eq("active",true),
    supabase.from("activity_updates").select("activity_id,update_type,message,created_at").order("created_at",{ascending:false}).limit(100),
  ]);
  const enrollmentList=enrollments||[];
  const countByActivity=new Map(((enrollmentCounts||[]) as {activity_id:string;enrolled_count:number|string}[]).map(i=>[i.activity_id,Number(i.enrolled_count)]));
  const freeSchedules=(freeData||[]) as FreeSchedule[];
  const freeByDate=new Map(freeSchedules.map(s=>[s.schedule_date,s]));
  const days=Array.from({length:7},(_,i)=>addDays(startDate,i));
  const directory=new Map(((directoryRows||[]) as Directory[]).map(i=>[i.id,i]));
  const facilitators=(facilitatorRows||[]) as Facilitator[];
  const updates=(updateRows||[]) as Update[];
  const canManageActivities=profile.role==="governance"||profile.role==="admin";
  const canManageFree=profile.role==="coach"||profile.role==="admin";
  const canMarkAttendance=["manager","psychologist","provider","governance","coach","nurse","admin"].includes(profile.role);
  const visibleActivities=(activities||[]).filter(activity=>showPrescribed?activity.requires_prescription:!activity.requires_prescription);

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Bien-être & vie du séjour</div><h1>Activités</h1><p>{profile.role==="patient"?"Repérez immédiatement les activités avec ou sans prescription, puis retrouvez-les dans votre planning.":"Gérez les activités et précisez clairement si une prescription est nécessaire."}</p></div>{profile.role==="patient"&&<Link className="button button-secondary" href="/portal/appointments">◷ Voir dans mon planning</Link>}</div>
    <nav className="section-tabs" aria-label="Types d'activités"><Link href="/portal/activities" className={!showFree&&!showPrescribed?"active":""}>Sans prescription</Link><Link href="/portal/activities?section=prescribed" className={showPrescribed?"active":""}>Avec prescription</Link><Link href="/portal/activities?section=free" className={showFree?"active":""}>Libres & collectives</Link></nav>

    {showFree ? <div className={canManageFree?"dashboard-grid":"stack"}><section className="card"><div className="card-header"><div><h2>Cette semaine</h2><p className="card-subtitle">Sans prescription ni inscription : venez simplement au créneau indiqué.</p></div></div><div className="card-body"><div className="free-activity-grid">{days.map(date=>{const s=freeByDate.get(date);return <article className="free-activity-card" key={date}><span>{formatDate(date)}</span><strong>{s?.note||"Temps libre au jardin"}</strong><small>{displayTime(s?.opens_at||"09:00")} → {displayTime(s?.closes_at||"10:00")}</small><em>Sans prescription</em></article>})}</div></div></section>{canManageFree&&<aside className="card"><div className="card-header"><h2>Modifier un créneau libre</h2></div><div className="card-body"><SportRoomScheduleForm/></div></aside>}</div> : <div className={canManageActivities?"dashboard-grid":"stack"}>
      <section className="card"><div className="card-header"><div><h2>{showPrescribed?"Avec prescription":"Sans prescription"}</h2><p className="card-subtitle">Horaire, lieu, intervenant et condition d’accès sont visibles en un coup d’œil.</p></div></div><div className="card-body"><div className="activity-card-grid">{visibleActivities.length?visibleActivities.map(activity=>{const used=countByActivity.get(activity.id)||0;const enrolled=enrollmentList.find(e=>e.activity_id===activity.id&&e.patient_id===profile.id);const attendees=enrollmentList.filter(e=>e.activity_id===activity.id);const link=facilitators.find(i=>i.activity_id===activity.id&&i.is_primary)||facilitators.find(i=>i.activity_id===activity.id);const facilitator=link?directory.get(link.clinician_id):undefined;const latest=updates.find(i=>i.activity_id===activity.id);const canPublish=(!!facilitator?.user_id&&facilitator.user_id===profile.id)||canManageActivities;return <article className={`activity-card${enrolled?" activity-card--enrolled":""}`} key={activity.id}><div className="activity-card-top"><span className="activity-date">{formatDateTime(activity.starts_at)}</span><span className={activity.requires_prescription?"badge badge-warning":"badge badge-success"}>{activity.requires_prescription?"Avec prescription":"Sans prescription"}</span>{profile.role==="patient"&&<span className={enrolled?"badge badge-success":"badge badge-neutral"}>{enrolled?"Inscrit":"Disponible"}</span>}</div><h3>{activity.title}</h3><p>{activity.description||"Activité proposée pendant votre séjour."}</p><div className="activity-meta"><span>⌖ {activity.location||"Lieu à confirmer"}</span><span>◎ {used}/{activity.capacity} places</span></div><div className="activity-facilitator"><span className="patient-avatar">{facilitator?.full_name?facilitator.full_name.split(" ").map(p=>p[0]).slice(0,2).join(""):"?"}</span><span><strong>{facilitator?.full_name||"Intervenant à confirmer"}</strong><small>{facilitator?.specialty||"Intervenant"}</small></span></div>{latest&&<div className={`activity-alert activity-alert--${latest.update_type}`}><strong>{latest.update_type==="absence"?"Absence":latest.update_type==="change"?"Modification":"Information"}</strong><span>{latest.message}</span></div>}{profile.role==="patient"?<div className="activity-card-action"><ActivityButton activityId={activity.id} enrolled={Boolean(enrolled)} full={used>=activity.capacity}/>{enrolled&&<span className="row-meta">{attendanceLabels[enrolled.attendance_status as AttendanceStatus]}</span>}</div>:<span className="badge badge-info">{used} inscrit{used>1?"s":""}</span>}{canPublish&&<details className="activity-publish-box"><summary>Informer les inscrits</summary><ActivityUpdateForm activityId={activity.id}/></details>}{canMarkAttendance&&attendees.length>0&&<details className="attendance-list"><summary>Présences ({attendees.length})</summary>{attendees.map(attendee=>{const patient=Array.isArray(attendee.patient)?attendee.patient[0]:attendee.patient;return <div className="list-row" key={attendee.id}><span>{patient?.full_name||"Patient"}</span><AttendanceActions kind="activity" recordId={attendee.id}/></div>})}</details>}</article>}) : <p className="empty">Aucune activité {showPrescribed?"avec":"sans"} prescription programmée.</p>}</div></div></section>
      {canManageActivities&&<aside className="card"><div className="card-header"><h2>Ajouter une activité</h2></div><div className="card-body"><ActivityForm/></div></aside>}
    </div>}
  </PortalShell>;
}
