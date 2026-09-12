export type AppRole =
  | "patient"
  | "doctor"
  | "manager"
  | "reception"
  | "psychologist"
  | "governance"
  | "technical"
  | "coach"
  | "nurse"
  | "admin"
  | "provider";

export type PermissionStatus =
  | "submitted"
  | "waiting"
  | "approved"
  | "refused"
  | "cancelled"
  | "departed"
  | "returned";

export type AttendanceStatus = "scheduled" | "present" | "absent";
export type VisitStatus = "scheduled" | "arrived" | "departed" | "cancelled";
export type CountryPackCode = "AURA_CORE" | "AURA_FR" | "AURA_DZ";
export type FacilityConfigValue = string | number | boolean | null;
export type FacilityConfig = Record<string, FacilityConfigValue>;

export type FacilitySummary = {
  id: string;
  organizationId: string;
  name: string;
  countryPackCode: CountryPackCode;
  countryCode: string;
  timezone: string;
  locale: string;
  currency: string;
  role: AppRole;
  isPrimary: boolean;
  isActive: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
  phone: string | null;
  facility: FacilitySummary;
  facilities: FacilitySummary[];
  facilityConfig: FacilityConfig;
  activeStay?: { room_number: string | null; started_at: string } | null;
};

export const roleLabels: Record<AppRole, string> = {
  patient: "Patient",
  doctor: "Médecin",
  manager: "Cadre",
  reception: "Accueil",
  psychologist: "Psychologue",
  governance: "Gouvernance",
  technical: "Personnel technique",
  coach: "Coach sportif",
  nurse: "Infirmier",
  admin: "Administrateur",
  provider: "Intervenant",
};

export const permissionLabels: Record<PermissionStatus, string> = {
  submitted: "Soumise",
  waiting: "En attente de validation",
  approved: "Autorisée",
  refused: "Refusée",
  cancelled: "Annulée",
  departed: "Patient sorti",
  returned: "Retour enregistré",
};

export const attendanceLabels: Record<AttendanceStatus, string> = {
  scheduled: "Prévu",
  present: "Présent",
  absent: "Absence signalée",
};

export const visitLabels: Record<VisitStatus, string> = {
  scheduled: "Prévue",
  arrived: "Visiteur arrivé",
  departed: "Visite terminée",
  cancelled: "Annulée",
};
