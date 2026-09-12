import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, CountryPackCode, FacilityConfig, FacilitySummary, Profile } from "@/lib/types";

export const careRoles: AppRole[] = ["doctor", "manager", "psychologist", "nurse", "provider"];
export const appointmentRoles: AppRole[] = ["doctor", "manager", "psychologist", "provider"];
export const attendanceRoles: AppRole[] = ["doctor", "manager", "psychologist", "provider", "governance", "coach", "admin"];

type FacilityRpcRow = {
  facility_id: string;
  organization_id: string;
  facility_name: string;
  country_pack_code: CountryPackCode;
  country_code: string;
  timezone: string;
  default_locale: string;
  currency_code: string;
  role: AppRole;
  is_primary: boolean;
  is_active: boolean;
};

function mapFacility(row: FacilityRpcRow): FacilitySummary {
  return {
    id: row.facility_id,
    organizationId: row.organization_id,
    name: row.facility_name,
    countryPackCode: row.country_pack_code,
    countryCode: row.country_code,
    timezone: row.timezone,
    locale: row.default_locale,
    currency: row.currency_code,
    role: row.role,
    isPrimary: row.is_primary,
    isActive: row.is_active,
  };
}

export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: facilityRows }, { data: facilityConfig }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, active, phone").eq("id", user.id).single(),
    supabase.rpc("get_my_facilities"),
    supabase.rpc("facility_effective_config", { p_facility_id: null }),
  ]);

  const facilities = ((facilityRows || []) as FacilityRpcRow[]).map(mapFacility);
  const facility = facilities.find((item) => item.isActive);
  if (!profile || !profile.active || !facility) redirect("/login?error=access");

  const scopedProfile: Profile = {
    ...profile,
    role: facility.role,
    facility,
    facilities,
    facilityConfig: (facilityConfig || {}) as FacilityConfig,
  };
  if (scopedProfile.role !== "patient") return scopedProfile;

  const { data: activeStay } = await supabase
    .from("patient_stays")
    .select("room_number, started_at")
    .eq("patient_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  return { ...scopedProfile, activeStay };
}

export function facilityFeatureEnabled(profile: Profile, feature: string) {
  const value = profile.facilityConfig[`features.${feature}`];
  return typeof value === "boolean" ? value : true;
}

export function facilitySettingNumber(profile: Profile, key: string, fallback: number) {
  const value = profile.facilityConfig[key];
  return typeof value === "number" ? value : fallback;
}

export function facilitySettingText(profile: Profile, key: string, fallback: string) {
  const value = profile.facilityConfig[key];
  return typeof value === "string" ? value : fallback;
}

export function canManagePermissions(role: AppRole) {
  return role === "doctor" || role === "manager";
}

export function isStaff(role: AppRole) {
  return role !== "patient";
}
