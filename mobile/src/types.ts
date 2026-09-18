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
  | "provider"
  | "trusted_contact";

export type Facility = {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  role: AppRole;
};

export type PatientContext = {
  id: string;
  fullName: string;
  phone: string | null;
  facility: Facility;
  facilityConfig: Record<string, unknown>;
  stay: {
    room_number: string | null;
    presence: string | null;
    planned_discharge_at: string | null;
  } | null;
};

export type PlanningEvent = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  meta: string;
  kind: "RDV" | "ACTIVITÉ" | "VISITE" | "PERMISSION" | "MÉDECIN";
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  location: string | null;
  capacity: number;
  requiresPrescription: boolean;
  enrolled: boolean;
  attendanceStatus: string | null;
};

export type VisitItem = {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  visitorOneName: string;
  visitorTwoName: string | null;
  status: string;
};

export type PermissionItem = {
  id: string;
  departureAt: string;
  returnAt: string;
  reason: string | null;
  status: string;
  doctorDecision: string | null;
  managerDecision: string | null;
};


export type NotificationItem = {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  kind: "MESSAGE" | "ACTIVITÉ";
  unread: boolean;
  priority: number;
  senderId: string | null;
};
