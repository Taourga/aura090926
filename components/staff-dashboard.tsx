import Link from "next/link";
import { MovementActions, PermissionDecisionActions } from "@/components/permission-actions";
import { StatusBadge } from "@/components/status-badge";
import { DoctorRoundForm, ExternalAppointmentForm } from "@/components/doctor-schedule-tools";
import { formatDateTime, formatTime } from "@/lib/format";
import type { AppRole, PermissionStatus } from "@/lib/types";

type Person = { full_name: string; phone?: string | null };
type Relation<T> = T | T[] | null;

export type StaffPermission = {
  id: string;
  departure_at: string;
  return_at: string;
  status: string;
  doctor_decision: string | null;
  manager_decision: string | null;
  departed_at: string | null;
  returned_at: string | null;
  reason: string | null;
  patient: Relation<Person>;
};

export type StaffStay = {
  id: string;
  presence: string;
  room_number: string | null;
  ward: Relation<{ name: string; floor: string | null }>;
  patient: Relation<Person>;
};

export type StaffAppointment = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  patient: Relation<Person>;
};

export type DoctorRound = {
  id: string;
  floor_number: number;
  scheduled_at: string;
};

export type DoctorScheduleBlock = {
  id: string;
  starts_at: string;
  ends_at: string;
};

export type OperationalRole = Extract<AppRole, "doctor" | "manager" | "nurse" | "reception">;

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] : value;
}

function PatientIdentity({ patient, detail }: { patient: Relation<Person>; detail?: string }) {
  const item = one(patient);
  const initials = (item?.full_name || "P").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="patient-identity"><span className="patient-avatar" aria-hidden="true">{initials}</span><span><strong>{item?.full_name || "Patient"}</strong>{detail && <small>{detail}</small>}</span></div>;
}

function PermissionMeta({ permission }: { permission: StaffPermission }) {
  return <div className="queue-meta"><span>Départ · {formatDateTime(permission.departure_at)}</span><span>Retour · {formatDateTime(permission.return_at)}</span></div>;
}

function EmptyQueue({ children }: { children: React.ReactNode }) {
  return <div className="queue-empty"><span aria-hidden="true">✓</span>{children}</div>;
}

function floorLabel(floor: number) {
  return floor === 0 ? "RDC" : floor === 1 ? "1er étage" : `${floor}e étage`;
}

export function StaffDashboard({ role, firstName, permissions, stays, appointments, doctorRounds = [], externalAppointments = [] }: {
  role: OperationalRole;
  firstName: string;
  permissions: StaffPermission[];
  stays: StaffStay[];
  appointments: StaffAppointment[];
  doctorRounds?: DoctorRound[];
  externalAppointments?: DoctorScheduleBlock[];
}) {
  const activeStays = stays || [];
  const presentStays = activeStays.filter((stay) => stay.presence === "present");
  const outStays = activeStays.filter((stay) => stay.presence === "out");
  const activePermissions = (permissions || []).filter((item) => ["waiting", "submitted", "approved", "departed"].includes(item.status));
  const medicalQueue = activePermissions.filter((item) => !item.doctor_decision && ["waiting", "submitted"].includes(item.status));
  const managerQueue = activePermissions.filter((item) => !item.manager_decision && ["waiting", "submitted"].includes(item.status));
  const departureQueue = activePermissions.filter((item) => item.status === "approved");
  const returnQueue = activePermissions.filter((item) => item.status === "departed");
  const approvedCount = activePermissions.filter((item) => ["approved", "departed"].includes(item.status)).length;
  const floorTotals = presentStays.reduce<Record<string, number>>((totals, stay) => {
    const ward = one(stay.ward);
    const label = ward?.floor || ward?.name || "Unité non renseignée";
    totals[label] = (totals[label] || 0) + 1;
    return totals;
  }, {});

  const content = {
    doctor: {
      eyebrow: "Espace médical",
      title: "Tournée et suivi des patients, au même endroit.",
      subtitle: "Publiez vos passages par étage, sélectionnez un patient et gardez votre planning sous contrôle.",
      action: { href: "/portal/patients", label: "Choisir un patient" },
      metrics: [
        [medicalQueue.length, "Validations en attente", "Permissions à traiter"],
        [doctorRounds.length, "Passages publiés", "Par étage"],
        [appointments.length, "Rendez-vous internes", "Planning clinique"],
        [externalAppointments.length, "RDV externes", "Créneaux réservés"],
      ],
    },
    manager: {
      eyebrow: "Pilotage d'unité",
      title: "Une vue claire sur l'unité et les validations.",
      subtitle: "Arbitrez les demandes de sortie, repérez les mouvements et suivez la présence par étage.",
      action: { href: "/portal/permissions", label: "Voir toutes les permissions" },
      metrics: [
        [managerQueue.length, "Décisions cadre", "À traiter maintenant"],
        [presentStays.length, "Patients présents", "Dans l'unité"],
        [outStays.length, "Patients sortis", "Retour attendu"],
        [Object.keys(floorTotals).length, "Étages actifs", "Présence suivie"],
      ],
    },
    nurse: {
      eyebrow: "Tour de service",
      title: "Le suivi patient, au rythme du service.",
      subtitle: "Repérez les présences, les sorties et les rendez-vous à venir en une lecture.",
      action: { href: "/portal/permissions", label: "Suivre les permissions" },
      metrics: [
        [presentStays.length, "Patients présents", "À l'instant"],
        [outStays.length, "Patients hors service", "Sorties en cours"],
        [appointments.length, "Rendez-vous à venir", "À anticiper"],
        [activePermissions.length, "Permissions actives", "À surveiller"],
      ],
    },
    reception: {
      eyebrow: "Accueil & mouvements",
      title: "Départs, retours et présence en temps réel.",
      subtitle: "Enregistrez les mouvements au bon moment et gardez une vue fiable de l'occupation.",
      action: { href: "/portal/permissions", label: "Ouvrir le registre" },
      metrics: [
        [departureQueue.length, "Départs à enregistrer", "Autorisations validées"],
        [returnQueue.length, "Retours attendus", "Patients à accueillir"],
        [presentStays.length, "Patients présents", "Occupants actuels"],
        [Object.keys(floorTotals).length, "Étages occupés", "Répartition actuelle"],
      ],
    },
  }[role];

  return <div className={`role-dashboard role-dashboard--${role}`}>
    <section className="role-hero">
      <div><p className="role-eyebrow">{content.eyebrow}</p><h1>Bonjour, {firstName}.</h1><p>{content.title}</p><span>{content.subtitle}</span></div>
      <Link className="button button-primary" href={content.action.href}>{content.action.label}</Link>
    </section>

    <div className="staff-metric-grid">{content.metrics.map(([value, title, detail]) => <article className="staff-metric" key={title}><strong>{value}</strong><span>{title}</span><small>{detail}</small></article>)}</div>

    {role === "doctor" && <div className="role-work-grid role-work-grid--doctor">
      <section className="work-card work-card--priority"><div className="work-card-head"><div><p className="section-kicker">Permissions</p><h2>Validations en attente</h2></div><span className="count-pill">{medicalQueue.length}</span></div><div className="work-card-body">{medicalQueue.length ? medicalQueue.map((permission) => <div className="queue-row" key={permission.id}><PatientIdentity patient={permission.patient} detail={permission.reason || "Motif non renseigné"} /><PermissionMeta permission={permission} /><div className="queue-action"><PermissionDecisionActions permissionId={permission.id} /></div></div>) : <EmptyQueue>Aucune permission en attente de validation.</EmptyQueue>}</div></section>
      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Planning</p><h2>Rendez-vous à venir</h2></div><Link href="/portal/appointments" className="text-link">Planning complet</Link></div><div className="work-card-body">{appointments.length || externalAppointments.length ? <div>{appointments.map((appointment) => <div className="timeline-row" key={appointment.id}><time>{formatTime(appointment.starts_at)}</time><PatientIdentity patient={appointment.patient} detail={`${appointment.title} · ${appointment.location || "Lieu à confirmer"}`} /></div>)}{externalAppointments.map((appointment) => <div className="timeline-row timeline-row--external" key={appointment.id}><time>{formatDateTime(appointment.starts_at)}</time><div><strong>RDV externe</strong><small>Créneau réservé · aucun détail affiché</small></div></div>)}</div> : <EmptyQueue>Aucun rendez-vous à venir.</EmptyQueue>}</div></section>
      <section className="work-card role-work-grid--full doctor-round-card"><div className="work-card-head"><div><p className="section-kicker">Tournée par étage</p><h2>Informer les patients de votre passage</h2></div></div><div className="doctor-round-content"><DoctorRoundForm /><div className="doctor-round-list">{doctorRounds.length ? doctorRounds.map((round) => <div className="doctor-round-item" key={round.id}><span>{floorLabel(round.floor_number)}</span><strong>{formatDateTime(round.scheduled_at)}</strong><small>Visible par les patients des chambres {round.floor_number}xx</small></div>) : <div className="queue-empty"><span aria-hidden="true">i</span>Aucun passage publié pour le moment.</div>}</div></div></section>
      <section className="work-card role-work-grid--full external-slot-card"><div className="work-card-head"><div><p className="section-kicker">Créneau privé</p><h2>Ajouter un RDV externe</h2></div></div><div className="work-card-body"><p className="card-subtitle external-slot-copy">Ce créneau n&apos;affiche ni patient, ni motif, ni détail dans le planning.</p><ExternalAppointmentForm /></div></section>
    </div>}

    {role === "manager" && <div className="role-work-grid role-work-grid--manager">
      <section className="work-card work-card--priority"><div className="work-card-head"><div><p className="section-kicker">Décisions cadre</p><h2>Validations à arbitrer</h2></div><span className="count-pill">{managerQueue.length}</span></div><div className="work-card-body">{managerQueue.length ? managerQueue.map((permission) => <div className="queue-row" key={permission.id}><PatientIdentity patient={permission.patient} detail={permission.reason || "Motif non renseigné"} /><PermissionMeta permission={permission} /><div className="queue-action"><PermissionDecisionActions permissionId={permission.id} /></div></div>) : <EmptyQueue>Aucune validation cadre en attente.</EmptyQueue>}</div></section>
      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Occupation</p><h2>Présence par étage</h2></div></div><div className="work-card-body"><div className="unit-grid">{Object.entries(floorTotals).length ? Object.entries(floorTotals).map(([floor, total]) => <div className="unit-tile" key={floor}><span>{floor}</span><strong>{total}</strong><small>patient{total > 1 ? "s" : ""} présent{total > 1 ? "s" : ""}</small></div>) : <EmptyQueue>Aucune présence enregistrée.</EmptyQueue>}</div><div className="movement-summary"><span>Sorties à suivre</span><strong>{outStays.length}</strong><span>Permission{approvedCount > 1 ? "s" : ""} autorisée{approvedCount > 1 ? "s" : ""}</span><strong>{approvedCount}</strong></div></div></section>
    </div>}

    {role === "nurse" && <div className="role-work-grid role-work-grid--nurse">
      <section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Patients de l'unité</p><h2>Suivi de présence</h2></div><span className="count-pill">{activeStays.length}</span></div><div className="work-card-body">{activeStays.length ? activeStays.map((stay) => { const ward = one(stay.ward); const patient = one(stay.patient); return <div className="care-row" key={stay.id}><PatientIdentity patient={stay.patient} detail={`${ward?.name || "Unité"} · Chambre ${stay.room_number || "—"}`} /><div className="care-contact">{patient?.phone || "Coordonnées non renseignées"}</div><span className={`presence-pill ${stay.presence === "present" ? "presence-pill--present" : "presence-pill--out"}`}>{stay.presence === "present" ? "Présent" : "Sorti"}</span></div>; }) : <EmptyQueue>Aucun séjour actif dans votre périmètre.</EmptyQueue>}</div></section>
      <div className="stack"><section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Mouvements</p><h2>À surveiller</h2></div></div><div className="work-card-body">{activePermissions.length ? activePermissions.slice(0, 4).map((permission) => <div className="compact-row" key={permission.id}><PatientIdentity patient={permission.patient} detail={`Départ ${formatDateTime(permission.departure_at)}`} /><StatusBadge status={permission.status as PermissionStatus} /></div>) : <EmptyQueue>Aucun mouvement en cours.</EmptyQueue>}</div></section><section className="work-card"><div className="work-card-head"><div><p className="section-kicker">Planning</p><h2>Prochains rendez-vous</h2></div></div><div className="work-card-body">{appointments.length ? appointments.slice(0, 3).map((appointment) => <div className="timeline-row" key={appointment.id}><time>{formatTime(appointment.starts_at)}</time><PatientIdentity patient={appointment.patient} detail={appointment.title} /></div>) : <EmptyQueue>Aucun rendez-vous à venir.</EmptyQueue>}</div></section></div>
    </div>}

    {role === "reception" && <div className="role-work-grid role-work-grid--reception">
      <section className="work-card work-card--departure"><div className="work-card-head"><div><p className="section-kicker">Départs validés</p><h2>À enregistrer maintenant</h2></div><span className="count-pill">{departureQueue.length}</span></div><div className="work-card-body">{departureQueue.length ? departureQueue.map((permission) => <div className="queue-row queue-row--movement" key={permission.id}><PatientIdentity patient={permission.patient} detail={`Prévu · ${formatDateTime(permission.departure_at)}`} /><div className="queue-action"><MovementActions permissionId={permission.id} action="depart" /></div></div>) : <EmptyQueue>Aucun départ autorisé à enregistrer.</EmptyQueue>}</div></section>
      <section className="work-card work-card--return"><div className="work-card-head"><div><p className="section-kicker">Patients sortis</p><h2>Retours attendus</h2></div><span className="count-pill">{returnQueue.length}</span></div><div className="work-card-body">{returnQueue.length ? returnQueue.map((permission) => <div className="queue-row queue-row--movement" key={permission.id}><PatientIdentity patient={permission.patient} detail={`Retour prévu · ${formatDateTime(permission.return_at)}`} /><div className="queue-action"><MovementActions permissionId={permission.id} action="return" /></div></div>) : <EmptyQueue>Aucun retour à enregistrer.</EmptyQueue>}</div></section>
      <section className="work-card role-work-grid--full"><div className="work-card-head"><div><p className="section-kicker">Occupation en direct</p><h2>Patients présents par étage</h2></div><span className="live-indicator"><i />Mise à jour à l'ouverture</span></div><div className="work-card-body"><div className="unit-grid">{Object.entries(floorTotals).length ? Object.entries(floorTotals).map(([floor, total]) => <div className="unit-tile" key={floor}><span>{floor}</span><strong>{total}</strong><small>patients présents</small></div>) : <EmptyQueue>Aucun patient présent.</EmptyQueue>}</div></div></section>
    </div>}
  </div>;
}
