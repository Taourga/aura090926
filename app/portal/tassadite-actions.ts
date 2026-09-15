"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { facilityFeatureEnabled, requireProfile } from "@/lib/auth";

type Result = { error?: string; success?: string };

function refresh() {
  ["/portal", "/portal/appointments", "/portal/activities", "/portal/patients", "/portal/permissions"].forEach((path) => revalidatePath(path));
}

export async function addPersonalPlanningEvent(formData: FormData): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== "patient") return;
  const title = String(formData.get("title") || "").trim();
  const startsAt = String(formData.get("startsAt") || "");
  const endsAt = String(formData.get("endsAt") || "");
  const location = String(formData.get("location") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  if (title.length < 2 || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) return;
  const supabase = await createClient();
  await supabase.from("patient_personal_events").insert({
    facility_id: profile.facility.id,
    patient_id: profile.id,
    title,
    starts_at: startsAt,
    ends_at: endsAt,
    location: location || null,
    notes: notes || null,
  });
  refresh();
}

export async function updateDoctorSpecialty(formData: FormData): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return;
  const specialty = String(formData.get("specialty") || "").trim().slice(0, 100);
  if (!specialty) return;
  const supabase = await createClient();
  await supabase.from("care_team_directory").update({ specialty }).eq("facility_id", profile.facility.id).eq("user_id", profile.id).eq("member_type", "doctor");
  refresh();
}

export async function createActivityEnhanced(input: { title: string; description: string; startsAt: string; endsAt: string; location: string; capacity: number; requiresPrescription: boolean }): Promise<Result> {
  const profile = await requireProfile();
  if (!facilityFeatureEnabled(profile, "activities")) return { error: "Le module Activités est désactivé." };
  if (profile.role !== "governance" && profile.role !== "admin") return { error: "Vous n’êtes pas autorisé à ajouter une activité." };
  if (!input.title.trim() || !input.startsAt || !input.endsAt || !Number.isInteger(input.capacity) || input.capacity < 1 || new Date(input.endsAt) <= new Date(input.startsAt)) return { error: "Vérifiez le titre, les horaires et le nombre de places." };
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    facility_id: profile.facility.id,
    title: input.title.trim(),
    description: input.description.trim() || null,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: input.location.trim() || null,
    capacity: input.capacity,
    active: true,
    requires_prescription: input.requiresPrescription,
  });
  if (error) return { error: error.message };
  refresh();
  return { success: "L’activité est publiée." };
}
