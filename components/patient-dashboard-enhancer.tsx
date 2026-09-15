"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type EventItem = { id: string; time: string; end: string | null; label: string; meta: string; kind: string; href: string };
type DayItem = { date: string; events: EventItem[] };
type DashboardData = {
  locale: string;
  timezone: string;
  today: string;
  days: DayItem[];
  nextRound: { scheduledAt: string; durationMinutes: number | null; floor: number | null; doctor?: string | null } | null;
  nextMeal: { label: string; hour: number; description: string; date: string } | null;
  referenceDoctor: { fullName: string; specialty: string | null } | null;
};

function formatTime(value: string, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale || "fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

function dayLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale || "fr-FR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export function PatientDashboardEnhancer() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [mode, setMode] = useState<"tomorrow" | "week">("tomorrow");

  useEffect(() => {
    if (window.location.pathname !== "/portal") return;
    let cancelled = false;
    fetch("/api/patient-dashboard", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<DashboardData>;
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        const host = document.querySelector<HTMLElement>(".patient-cockpit-main");
        if (!host) return;
        let root = host.querySelector<HTMLElement>(".aura-patient-dense-root");
        if (!root) {
          root = document.createElement("div");
          root.className = "aura-patient-dense-root";
          host.appendChild(root);
        }
        host.classList.add("aura-dense-active");
        setMount(root);
        setData(payload);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const today = data?.days?.[0];
  const tomorrow = data?.days?.[1];
  const nextDays = useMemo(() => data?.days || [], [data]);

  if (!mount || !data || !today || !tomorrow) return null;

  const content = (
    <section className="patient-dense-dashboard" aria-label="Vue synthétique du séjour">
      <div className="patient-dense-grid">
        <article className="patient-dense-card patient-dense-card--today">
          <header><div><span>AUJOURD’HUI</span><strong>{today.events.length ? `${today.events.length} repère${today.events.length > 1 ? "s" : ""}` : "Journée calme"}</strong></div><Link href="/portal/appointments">Planning →</Link></header>
          <div className="patient-dense-list patient-dense-list--compact">
            {today.events.length ? today.events.slice(0, 4).map((event) => (
              <Link href={event.href} key={event.id} className="patient-dense-event">
                <time>{formatTime(event.time, data.locale, data.timezone)}</time>
                <div><small>{event.kind}</small><strong>{event.label}</strong><span>{event.meta}</span></div>
              </Link>
            )) : <p className="patient-dense-empty">Rien de prévu pour le moment.</p>}
          </div>
        </article>

        <article className="patient-dense-card patient-dense-card--focus">
          <header className="patient-dense-focus-head">
            <div><span>{mode === "tomorrow" ? "DEMAIN" : "7 PROCHAINS JOURS"}</span><strong>{mode === "tomorrow" ? `${tomorrow.events.length} événement${tomorrow.events.length > 1 ? "s" : ""}` : `${nextDays.reduce((sum, day) => sum + day.events.length, 0)} événements`}</strong></div>
            <div className="patient-dense-tabs"><button type="button" className={mode === "tomorrow" ? "active" : ""} onClick={() => setMode("tomorrow")}>Demain</button><button type="button" className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Semaine</button></div>
          </header>

          {mode === "tomorrow" ? (
            <div className="patient-dense-list patient-dense-list--detail">
              {tomorrow.events.length ? tomorrow.events.slice(0, 6).map((event) => (
                <Link href={event.href} key={event.id} className="patient-dense-event patient-dense-event--detail">
                  <time>{formatTime(event.time, data.locale, data.timezone)}</time>
                  <div><small>{event.kind}</small><strong>{event.label}</strong><span>{event.meta}</span></div>
                  <b>›</b>
                </Link>
              )) : <p className="patient-dense-empty">Aucun événement prévu demain.</p>}
            </div>
          ) : (
            <div className="patient-dense-week">
              {nextDays.map((day, index) => <div key={day.date} className={`patient-dense-day${index === 0 ? " is-today" : ""}`}><span>{dayLabel(day.date, data.locale)}</span><strong>{day.events.length}</strong><small>{day.events[0]?.label || "Libre"}</small></div>)}
            </div>
          )}
        </article>

        <aside className="patient-dense-side">
          <article className="patient-dense-mini patient-dense-mini--round"><span>PASSAGE DU MÉDECIN</span>{data.nextRound ? <><strong>{formatTime(data.nextRound.scheduledAt, data.locale, data.timezone)}</strong><small>{data.nextRound.floor != null ? `Étage ${data.nextRound.floor}` : "Étage à confirmer"}{data.nextRound.doctor ? ` · ${data.nextRound.doctor}` : ""}</small>{data.nextRound.durationMinutes ? <em>≈ {data.nextRound.durationMinutes} min</em> : null}</> : <><strong>À confirmer</strong><small>Aucun passage publié pour les prochains jours.</small></>}</article>
          {data.nextMeal && <Link href="/portal/menus" className="patient-dense-mini"><span>PROCHAIN REPAS</span><strong>{data.nextMeal.label} · {data.nextMeal.hour} h</strong><small>{data.nextMeal.description}</small></Link>}
          {data.referenceDoctor && <article className="patient-dense-mini"><span>MÉDECIN RÉFÉRENT</span><strong>{data.referenceDoctor.fullName}</strong><small>{data.referenceDoctor.specialty || "Médecin référent"}</small></article>}
        </aside>
      </div>

      <div className="patient-dense-week-strip">
        {nextDays.map((day, index) => <Link href="/portal/appointments" key={day.date} className={index === 0 ? "is-today" : ""}><span>{dayLabel(day.date, data.locale)}</span><strong>{day.events.length}</strong><small>{day.events.length ? `${day.events.length} élément${day.events.length > 1 ? "s" : ""}` : "Libre"}</small></Link>)}
      </div>
    </section>
  );

  return createPortal(content, mount);
}
