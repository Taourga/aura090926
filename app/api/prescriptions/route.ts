import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FacilityRow={facility_id:string;role:string;is_active:boolean};

async function context(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {error:NextResponse.json({error:"Non authentifié"},{status:401})};
  const {data:rows}=await supabase.rpc("get_my_facilities");
  const facility=((rows||[]) as FacilityRow[]).find(r=>r.is_active);
  if(!facility) return {error:NextResponse.json({error:"Établissement introuvable"},{status:403})};
  return {supabase,user,facility};
}

async function resolvePatient(supabase:any,patientKey:string){
  if(patientKey.startsWith("demo:")){
    const rosterId=patientKey.slice(5);
    const {data:roster}=await supabase.from("clinic_patient_roster").select("id,linked_profile_id,display_name").eq("id",rosterId).maybeSingle();
    return roster?{rosterId:roster.id,patientId:roster.linked_profile_id||null,name:roster.display_name}:null;
  }
  const {data:roster}=await supabase.from("clinic_patient_roster").select("id,linked_profile_id,display_name").eq("linked_profile_id",patientKey).eq("active",true).limit(1).maybeSingle();
  return roster?{rosterId:roster.id,patientId:roster.linked_profile_id||patientKey,name:roster.display_name}:null;
}

export async function GET(req:NextRequest){
  const ctx=await context(); if("error" in ctx)return ctx.error;
  const {supabase,user,facility}=ctx;
  const patientKey=req.nextUrl.searchParams.get("patient");
  const {data:services}=await supabase.from("activity_services").select("id,code,title,description,default_location,clinician_id,clinician:care_team_directory!activity_services_clinician_id_fkey(full_name,specialty,user_id)").eq("facility_id",facility.facility_id).eq("active",true).order("title");
  if(patientKey){
    const target=await resolvePatient(supabase,patientKey); if(!target)return NextResponse.json({error:"Patient introuvable"},{status:404});
    const {data:prescriptions}=await supabase.from("activity_prescriptions").select("id,status,notes,created_at,patient_id,roster_id,service:activity_services(title,code,default_location),clinician:care_team_directory!activity_prescriptions_assigned_clinician_id_fkey(full_name,specialty),sessions:activity_prescription_sessions(id,starts_at,ends_at,location,notes)").eq("roster_id",target.rosterId).order("created_at",{ascending:false});
    return NextResponse.json({role:facility.role,patient:target,services:services||[],prescriptions:prescriptions||[]});
  }
  if(facility.role==="patient"){
    const {data:prescriptions}=await supabase.from("activity_prescriptions").select("id,status,notes,created_at,service:activity_services(title,code,default_location),clinician:care_team_directory!activity_prescriptions_assigned_clinician_id_fkey(full_name,specialty),sessions:activity_prescription_sessions(id,starts_at,ends_at,location,notes)").eq("patient_id",user.id).order("created_at",{ascending:false});
    return NextResponse.json({role:facility.role,prescriptions:prescriptions||[]});
  }
  if(["provider","psychologist","coach"].includes(facility.role)){
    const {data:directory}=await supabase.from("care_team_directory").select("id,full_name,specialty").eq("user_id",user.id).eq("active",true).maybeSingle();
    if(!directory)return NextResponse.json({role:facility.role,directory:null,prescriptions:[]});
    const {data:prescriptions}=await supabase.from("activity_prescriptions").select("id,status,notes,created_at,patient_id,roster_id,service:activity_services(title,code,default_location),patient:profiles(full_name),roster:clinic_patient_roster(display_name,room_number),sessions:activity_prescription_sessions(id,starts_at,ends_at,location,notes)").eq("assigned_clinician_id",directory.id).eq("status","active").order("created_at",{ascending:false});
    return NextResponse.json({role:facility.role,directory,prescriptions:prescriptions||[]});
  }
  return NextResponse.json({role:facility.role,services:services||[],prescriptions:[]});
}

export async function POST(req:NextRequest){
  const ctx=await context(); if("error" in ctx)return ctx.error;
  const {supabase,user,facility}=ctx;
  const body=await req.json().catch(()=>({}));
  if(body.action==="prescribe"){
    if(facility.role!=="doctor")return NextResponse.json({error:"Action réservée au médecin."},{status:403});
    const target=await resolvePatient(supabase,String(body.patientKey||"")); if(!target)return NextResponse.json({error:"Patient introuvable."},{status:404});
    const {data:service}=await supabase.from("activity_services").select("id,clinician_id,title").eq("id",String(body.serviceId||"")).eq("facility_id",facility.facility_id).eq("active",true).maybeSingle();
    if(!service)return NextResponse.json({error:"Activité indisponible."},{status:400});
    const {error}=await supabase.from("activity_prescriptions").insert({facility_id:facility.facility_id,roster_id:target.rosterId,patient_id:target.patientId,service_id:service.id,prescribed_by:user.id,assigned_clinician_id:service.clinician_id,notes:String(body.notes||"").trim()||null});
    if(error)return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({success:`${service.title} prescrite.`});
  }
  if(body.action==="schedule"){
    if(!["provider","psychologist","coach"].includes(facility.role))return NextResponse.json({error:"Action réservée à l’intervenant."},{status:403});
    const startsAt=String(body.startsAt||""),endsAt=String(body.endsAt||"");
    if(!startsAt||!endsAt||new Date(endsAt)<=new Date(startsAt))return NextResponse.json({error:"Vérifiez les horaires."},{status:400});
    const {data:prescription}=await supabase.from("activity_prescriptions").select("id,patient_id,service:activity_services(title,default_location)").eq("id",String(body.prescriptionId||"")).maybeSingle();
    if(!prescription)return NextResponse.json({error:"Prescription introuvable."},{status:404});
    const service=Array.isArray(prescription.service)?prescription.service[0]:prescription.service;
    const location=String(body.location||"").trim()||service?.default_location||null;
    let appointmentId:null|string=null;
    if(prescription.patient_id){
      const {data:appointment,error:appointmentError}=await supabase.from("appointments").insert({patient_id:prescription.patient_id,creator_id:user.id,title:service?.title||"Activité prescrite",starts_at:startsAt,ends_at:endsAt,location,notes:"Séance planifiée suite à une prescription AURA."}).select("id").single();
      if(appointmentError)return NextResponse.json({error:appointmentError.message},{status:400});
      appointmentId=appointment.id;
    }
    const {error}=await supabase.from("activity_prescription_sessions").insert({prescription_id:prescription.id,patient_id:prescription.patient_id,creator_id:user.id,starts_at:startsAt,ends_at:endsAt,location,notes:String(body.notes||"").trim()||null,appointment_id:appointmentId});
    if(error)return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({success:prescription.patient_id?"Séance ajoutée au planning du patient.":"Séance ajoutée au scénario de démonstration."});
  }
  return NextResponse.json({error:"Action inconnue."},{status:400});
}
