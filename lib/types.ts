export type AppRole =
  | "patient"
  | "doctor"
  | "manager"
  | "reception"
  | "psychologist"
  | "governance"
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
  nurse: "Infirmier",
  admin: "Administrateur",
  provider: "Intervenant",
};

export const permissionLabels: Record<PermissionStatus, string> = {
  submitted: "Soumise",
  waiting: "En attente d'avis",
  approved: "Autorisée",
  refused: "Refusée",
  cancelled: "Annulée",
  departed: "Patient sorti",
  returned: "Retour enregistré",
};
