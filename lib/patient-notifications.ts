import "server-only";

export type NotificationRecipient = { full_name: string; email: string | null };

export async function sendPatientUpdateEmails(recipients: NotificationRecipient[], subject: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const patientEmails = [...new Set(recipients.map((recipient) => recipient.email?.trim()).filter((email): email is string => Boolean(email)))];
  if (!patientEmails.length) return;

  const portalUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aura090926.vercel.app";
  const from = process.env.RESEND_FROM_EMAIL || "AURA <onboarding@resend.dev>";
  const text = `${subject}\n\nConnectez-vous à votre portail AURA pour consulter votre planning : ${portalUrl}/portal\n\nCet e-mail ne contient aucun détail de santé.`;

  await Promise.allSettled(patientEmails.map(async (to) => {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
  }));
}
