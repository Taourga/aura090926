export function formatDateTime(value: string | null | undefined, locale = "fr-FR", timeZone = "Europe/Paris") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}

export function formatTime(value: string | null | undefined, locale = "fr-FR", timeZone = "Europe/Paris") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(value));
}

export function formatDate(value: string | null | undefined, locale = "fr-FR", timeZone = "Europe/Paris") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone }).format(new Date(value));
}
