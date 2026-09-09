import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

export const careRoles: AppRole[] = ["doctor", "manager", "psychologist", "nurse", "provider"];
export const appointmentRoles: AppRole[] = ["doctor", "manager", "psychologist", "provider"];

export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, phone")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) redirect("/login?error=access");
  return profile as Profile;
}

export function canManagePermissions(role: AppRole) {
  return role === "doctor" || role === "manager";
}

export function isStaff(role: AppRole) {
  return role !== "patient";
}
