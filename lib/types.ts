export type AppRole =
  | "patient"
  | "doctor"
  | "manager"
  | "reception"
  | "psychologist"
  | "governance"
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

export type Profile = {
  id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
  phone: string | null;
};

export const roleLabels: Record<AppRole, string> = {
  patient: "Patient",
  doctor: "Médecin",
  manager: "Cadre",
  reception: "Accueil",
  psychologist: "Psychologue",
  governance: "Gouvernance",
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
