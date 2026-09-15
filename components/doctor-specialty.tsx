import { updateDoctorSpecialty } from "@/app/portal/tassadite-actions";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const specialties = ["Médecine générale","Cardiologie","Chirurgie","Dermatologie","Endocrinologie","Gastro-entérologie","Gériatrie","Gynécologie","Neurologie","Oncologie","Pédiatrie","Pneumologie","Psychiatrie","Rhumatologie","Urologie"];

export async function DoctorSpecialty() {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return null;
  const supabase = await createClient();
  const { data } = await supabase.from("care_team_directory").select("specialty").eq("facility_id", profile.facility.id).eq("user_id", profile.id).eq("member_type","doctor").maybeSingle();
  const current = data?.specialty || "";
  return <form action={updateDoctorSpecialty} className="doctor-specialty-form">
    <label><span>Ma spécialité</span><select name="specialty" defaultValue={current || specialties[0]}>{current && !specialties.includes(current) && <option value={current}>{current}</option>}{specialties.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
    <button className="button button-secondary button-small">Enregistrer</button>
  </form>;
}
