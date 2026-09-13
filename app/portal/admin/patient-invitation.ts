"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function invitePatient(input: { firstName: string; lastName: string; email: string; entryDate: string }) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Action réservée à l’administrateur." };
  const firstName = typeof input?.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input?.lastName === "string" ? input.lastName.trim() : "";
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const date = typeof input?.entryDate === "string" ? input.entryDate : "";
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100 || email.length > 254 || !/^[^\s@%_]+@[^\s@%_]+\.[^\s@%_]+$/.test(email)) {
    return { error: "Renseignez un prénom, un nom et une adresse email valides." };
  }
  const day = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    return { error: "La date d’entrée est invalide." };
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // This demo-only feature must never run on a production deployment.
  if (!secret || process.env.VERCEL_ENV === "production" || (process.env.VERCEL && process.env.VERCEL_GIT_COMMIT_REF !== "aurademo")) {
    return { error: "L’envoi des invitations patient n’est pas configuré sur cet environnement." };
  }
  const origin = "https://aura090926-git-aurademo-wilyan.vercel.app";
  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const supabase = await createClient();
  const facilityId = profile.facility.id;
  try {
    // Compute local midnight using the facility timezone, including daylight saving.
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: profile.facility.timezone, timeZoneName: "longOffset" });
    let startedAt = day.getTime();
    for (let i = 0; i < 3; i++) {
      const offset = formatter.formatToParts(new Date(startedAt)).find((part) => part.type === "timeZoneName")!.value;
      const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
      const minutes = match ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1) : 0;
      startedAt = day.getTime() - minutes * 60000;
    }
    const { data: existing, error: lookupError } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (lookupError) return { error: "Impossible de vérifier le compte. Aucun nouvel envoi effectué." };
    let patientId = existing?.id as string | undefined;
    let sent = false;
    if (!patientId) {
      // Existing RPC renews/reuses the pending invitation; handle_new_user consumes it.
      const { error } = await supabase.rpc("invite_facility_member", { p_email: email, p_role: "patient" });
      if (error) return { error: "Impossible d’enregistrer l’invitation patient." };
      const { data, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/reset-password`,
        data: { full_name: `${firstName} ${lastName}`, first_name: firstName, last_name: lastName },
      });
      if (authError || !data.user) return { error: "L’envoi Auth a échoué. L’invitation est conservée ; vous pouvez réessayer." };
      patientId = data.user.id;
      sent = true;
    }
    // Never convert an existing staff account or attach an unrelated account here.
    const [{ data: invitation, error: invitationError }, { data: membership, error: membershipError }] = await Promise.all([
      admin.from("facility_invitations").select("id").eq("facility_id", facilityId).ilike("email", email).eq("role", "patient").not("accepted_at", "is", null).order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("facility_memberships").select("role, active").eq("facility_id", facilityId).eq("user_id", patientId).maybeSingle(),
    ]);
    if (invitationError || membershipError || !invitation || membership?.role !== "patient" || !membership.active) {
      return { error: sent ? "Email envoyé, mais le rattachement patient doit être vérifié avant de créer le séjour." : "Ce compte existe déjà sans invitation patient acceptée dans cet établissement." };
    }
    const { data: stay, error: stayError } = await admin.from("patient_stays").select("id, facility_id, started_at, ended_at").eq("id", invitation.id).maybeSingle();
    if (stayError) return { error: "Compte créé ; vérification du séjour indisponible. Réessayez sans renvoyer d’email." };
    if (stay) {
      if (stay.facility_id !== facilityId || stay.ended_at || new Date(stay.started_at).getTime() !== startedAt) {
        return { error: "Ce patient possède déjà un séjour avec une autre date ou un séjour clôturé. Vérifiez son dossier." };
      }
      return { success: sent ? "Email d’invitation envoyé. Le compte patient et le séjour sont créés." : "Le compte patient et son séjour existent déjà. Aucun nouvel email envoyé." };
    }
    // Stable invitation ID plus the existing active-stay unique index prevent duplicates,
    // including simultaneous submissions and retries after an interrupted response.
    const { error: insertError } = await admin.from("patient_stays").insert({
      id: invitation.id, facility_id: facilityId, patient_id: patientId, started_at: new Date(startedAt).toISOString(),
    });
    if (insertError) return { error: `${sent ? "Email envoyé." : "Compte patient existant."} Le séjour n’a pas été créé (un séjour actif peut déjà exister). Réessayez pour finaliser sans nouvel envoi.` };
    revalidatePath("/portal/admin");
    revalidatePath("/portal/patients");
    return { success: sent ? "Email d’invitation envoyé. Le compte patient et le séjour sont créés." : "Séjour créé pour le compte déjà invité. Aucun nouvel email envoyé." };
  } catch {
    return { error: "Invitation interrompue. Réessayez : un compte ou séjour déjà créé sera réutilisé." };
  }
}
