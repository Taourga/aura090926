export type CleaningTask = { id: string; area: string; target: string; kind: "room" | "lift" | "toilet"; period: "morning" | "noon" | "evening"; completed_at: string | null; completed_name: string | null };
export type RosterAssignment = { area: string; slot: number; agent_id: string; name: string };
export type HousekeepingData = {
  rosterDate: string | null;
  agents: { id: string; full_name: string }[];
  assignments: RosterAssignment[];
  tasks: CleaningTask[];
  rooms: { number: string; floor: number; occupied: boolean; entry: string | null; exit: string | null; skip: boolean }[];
  meals: { hour: string; count: number }[];
  unmappedRooms: number;
};
export const floorLabel = (floor: number) => floor === 0 ? "Rez-de-chaussée" : `Étage ${floor}`;
export const periodLabels = { morning: "Matin", noon: "Midi", evening: "Soir" };
export const roomNumbers = Array.from({ length: 4 }, (_, floor) => Array.from({ length: floor === 0 ? 10 : 30 }, (_, i) => String(floor * 100 + i + 1).padStart(3, "0"))).flat();

export function parisDate(date = new Date(), timeZone = "Europe/Paris") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function parisDateTime(value: string, timeZone = "Europe/Paris", locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function parisInput(value: string | null, timeZone = "Europe/Paris") {
  if (!value) return "";
  const date = new Date(value);
  return `${parisDate(date, timeZone)}T${new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date)}`;
}

export function validServiceDate(value: string | undefined) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
