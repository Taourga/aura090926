"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char] ?? char);
}

async function sendPatientInvitationEmail(input: { to: string; firstName: string; actionLink: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { error: "Resend n’est pas configuré sur cet environnement." };
  }

  const safeName = escapeHtml(input.firstName);
  const safeLink = escapeHtml(input.actionLink);
  const subject = "Activez votre espace patient AURA";
  const text = [
    `Bonjour ${input.firstName},`,
    "",
    "Votre espace patient AURA est prêt.",
    "Utilisez le lien sécurisé ci-dessous pour activer votre accès et définir votre mot de passe :",
    input.actionLink,
    "",
    "Si vous n’attendiez pas cette invitation, vous pouvez ignorer ce message.",
    "",
    "L’équipe AURA",
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;margin:0;padding:24px;color:#172033"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px"><tr><td><p style="font-size:16px;line-height:24px;margin:0 0 16px">Bonjour ${safeName},</p><p style="font-size:16px;line-height:24px;margin:0 0 24px">Votre espace patient AURA est prêt. Cliquez sur le bouton ci-dessous pour activer votre accès et définir votre mot de passe.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#111827;border-radius:10px"><a href="${safeLink}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:600">Activer mon espace AURA</a></td></tr></table><p style="font-size:13px;line-height:20px;color:#667085;margin:24px 0 0">Si vous n’attendiez pas cette invitation, vous pouvez ignorer ce message.</p></td></tr></table></td></tr></table></body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [input.to], subject, text, html }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Resend patient invitation failed", response.status);
    if (response.status === 403) {
      return { error: "Resend a refusé l’envoi. Vérifiez que le domaine d’envoi est validé et que l’adresse expéditrice utilise ce domaine." };
    }
    if (response.status === 429) {
      return { error: "La limite d’envoi Resend est atteinte. Réessayez dans quelques minutes." };
    }
    return { error: "Resend n’a pas pu envoyer l’email d’activation." };
  }

  return { success: true };
}

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
    let actionLink: string | null = null;
    let createdNow = false;

    if (!patientId) {
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        return { error: "Resend n’est pas encore configuré sur AURA Demo. Aucun compte patient n’a été créé." };
      }

      // Existing RPC renews/reuses the pending invitation; handle_new_user consumes it when Auth creates the user.
      const { error } = await supabase.rpc("invite_facility_member", { p_email: email, p_role: "patient" });
      if (error) return { error: "Impossible d’enregistrer l’invitation patient." };

      const { data, error: authError } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo: `${origin}/reset-password`,
          data: { full_name: `${firstName} ${lastName}`, first_name: firstName, last_name: lastName },
        },
      });
      if (authError || !data.user || !data.properties?.action_link) {
        return { error: "Supabase n’a pas pu générer le lien d’activation. L’invitation est conservée ; vous pouvez réessayer." };
      }
      patientId = data.user.id;
      actionLink = data.properties.action_link;
      createdNow = true;
    }

    // Never convert an existing staff account or attach an unrelated account here.
    const [{ data: invitation, error: invitationError }, { data: membership, error: membershipError }] = await Promise.all([
      admin.from("facility_invitations").select("id").eq("facility_id", facilityId).ilike("email", email).eq("role", "patient").not("accepted_at", "is", null).order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("facility_memberships").select("role, active").eq("facility_id", facilityId).eq("user_id", patientId).maybeSingle(),
    ]);
    if (invitationError || membershipError || !invitation || membership?.role !== "patient" || !membership.active) {
      return { error: createdNow ? "Compte créé, mais le rattachement patient doit être vérifié avant de poursuivre." : "Ce compte existe déjà sans invitation patient acceptée dans cet établissement." };
    }

    const { data: stay, error: stayError } = await admin.from("patient_stays").select("id, facility_id, started_at, ended_at").eq("id", invitation.id).maybeSingle();
    if (stayError) return { error: "Compte créé ; vérification du séjour indisponible. Réessayez sans créer un nouveau compte." };
    if (stay) {
      if (stay.facility_id !== facilityId || stay.ended_at || new Date(stay.started_at).getTime() !== startedAt) {
        return { error: "Ce patient possède déjà un séjour avec une autre date ou un séjour clôturé. Vérifiez son dossier." };
      }
    } else {
      // Stable invitation ID plus the existing active-stay unique index prevent duplicates,
      // including simultaneous submissions and retries after an interrupted response.
      const { error: insertError } = await admin.from("patient_stays").insert({
        id: invitation.id, facility_id: facilityId, patient_id: patientId, started_at: new Date(startedAt).toISOString(),
      });
      if (insertError) return { error: "Compte patient créé, mais le séjour n’a pas pu être créé. Réessayez pour finaliser sans recréer le compte." };
    }

    // A failed Resend attempt leaves the patient account and stay intact. On retry, generate a fresh recovery link.
    if (!actionLink) {
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(patientId);
      if (authUserError || !authUser.user) return { error: "Compte et séjour présents, mais l’état d’activation Auth est indisponible." };
      if (!authUser.user.email_confirmed_at) {
        if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
          return { error: "Compte patient et séjour présents, mais Resend n’est pas configuré pour renvoyer l’activation." };
        }
        const { data: recovery, error: recoveryError } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${origin}/reset-password` },
        });
        if (recoveryError || !recovery.properties?.action_link) {
          return { error: "Compte patient et séjour présents, mais le lien d’activation n’a pas pu être régénéré." };
        }
        actionLink = recovery.properties.action_link;
      }
    }

    if (actionLink) {
      const sendResult = await sendPatientInvitationEmail({ to: email, firstName, actionLink });
      if (sendResult.error) {
        return { error: `Le compte patient et le séjour sont créés. ${sendResult.error} Réessayez après correction : un nouveau lien sera généré.` };
      }
    }

    revalidatePath("/portal/admin");
    revalidatePath("/portal/patients");
    return {
      success: actionLink
        ? "Email d’activation envoyé via Resend. Le compte patient et le séjour sont créés."
        : "Le compte patient est déjà activé et son séjour existe. Aucun nouvel email envoyé.",
    };
  } catch {
    return { error: "Invitation interrompue. Réessayez : un compte ou séjour déjà créé sera réutilisé." };
  }
}
