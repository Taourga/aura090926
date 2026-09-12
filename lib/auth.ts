import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

export const careRoles: AppRole[] = ["doctor", "manager", "psychologist", "nurse", "provider"];
export const appointmentRoles: AppRole[] = ["doctor", "manager", "psychologist", "provider"];
export const attendanceRoles: AppRole[] = ["doctor", "manager", "psychologist", "provider", "governance", "coach", "admin"];

export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: facilityRole }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, active, phone")
      .eq("id", user.id)
      .single(),
    supabase.rpc("current_role"),
  ]);

  if (!profile || !profile.active || !facilityRole) redirect("/login?error=access");

  const scopedProfile = { ...profile, role: facilityRole as AppRole } as Profile;
  if (scopedProfile.role !== "patient") return scopedProfile;

  const { data: activeStay } = await supabase
    .from("patient_stays")
    .select("room_number, started_at")
    .eq("patient_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  return { ...scopedProfile, activeStay } as Profile;
}

export function canManagePermissions(role: AppRole) {
  return role === "doctor" || role === "manager";
}

export function isStaff(role: AppRole) {
  return role !== "patient";
}
