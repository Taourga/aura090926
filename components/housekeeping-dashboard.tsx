"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeCleaning, saveRoster } from "@/app/portal/housekeeping/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { floorLabel, parisDate, parisDateTime, periodLabels, type CleaningTask, type HousekeepingData } from "@/lib/housekeeping";

function TaskButton({ task, today, technical, timezone, locale }: { task: CleaningTask; today: boolean; technical: boolean; timezone: string; locale: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const router = useRouter();
  return <div>
    {task.completed_at ? <span className="cleaning-done">✓ {parisDateTime(task.completed_at, timezone, locale)}<small>{task.completed_name}</small></span> : technical && today ? <button className="button button-primary button-small" disabled={pending} onClick={() => startTransition(async () => { try { setResult(await completeCleaning(task.id)); router.refresh(); } catch { setResult({ error: "Le pointage n’a pas pu être confirmé. Actualisez puis réessayez." }); } })}>{pending ? "Validation…" : "Valider le nettoyage"}</button> : <span className="badge badge-warning">À faire</span>}
    <ActionFeedback error={result.error} message={result.success} />
  </div>;
}

function Assignments({ data, date }: { data: HousekeepingData; date: string }) {
  const lookup = (area: string, slot: number) => data.assignments.find(a => a.area === area && a.slot === slot)?.agent_id || "";
  const [floors, setFloors] = useState(Array.from({ length: 8 }, (_, i) => lookup(`floor-${Math.floor(i / 2)}`, i % 2 + 1)));
  const [lifts, setLifts] = useState(Array.from({ length: 3 }, (_, i) => lookup(`lift-${i + 1}`, 1)));
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const router = useRouter();
  function select(label: string, value: string, change: (value: string) => void) {
    return <label className="field">{label}<select required value={value} onChange={e => change(e.target.value)}><option value="">Choisir un agent</option>{data.agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select></label>;
  }
  return <details className="card housekeeping-roster"><summary>Affecter les agents · {data.agents.length} agents disponibles</summary><form className="card-body" onSubmit={e => { e.preventDefault(); startTransition(async () => { try { setResult(await saveRoster(date, floors, lifts)); router.refresh(); } catch { setResult({ error: "Impossible d’enregistrer les affectations." }); } }); }}>
    <p className="row-meta">Deux agents distincts par étage, responsables aussi des toilettes. Un poste d’ascenseur peut être cumulé avec un poste d’étage. Affectations reconduites chaque jour jusqu’au prochain changement.</p>
    <div className="cleaning-assignment-grid">{[0, 1, 2, 3].map(f => <fieldset key={f}><legend>{floorLabel(f)}</legend>{[0, 1].map(s => <div key={s}>{select(`Agent ${s + 1}`, floors[f * 2 + s], value => setFloors(old => old.map((v, i) => i === f * 2 + s ? value : v)))}</div>)}</fieldset>)}</div>
    <div className="cleaning-assignment-grid">{lifts.map((v, i) => <div key={i}>{select(`Ascenseur ${i + 1}`, v, value => setLifts(old => old.map((v, j) => i === j ? value : v)))}</div>)}</div>
    <button className="button button-primary" disabled={pending || data.agents.length < 8}>{pending ? "Enregistrement…" : "Enregistrer les affectations"}</button><ActionFeedback error={result.error} message={result.success} />
  </form></details>;
}

export function HousekeepingDashboard({ data, date, technical, timezone, locale }: { data: HousekeepingData; date: string; technical: boolean; timezone: string; locale: string }) {
  const router = useRouter();
  const localToday = parisDate(new Date(), timezone);
  const today = date === localToday;
  const [onlyPending, setOnlyPending] = useState(technical);
  useEffect(() => { const timer = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30000); return () => clearInterval(timer); }, [router]);
  const done = data.tasks.filter(t => t.completed_at).length;
  const rooms = data.tasks.filter(t => t.kind === "room");
  const common = data.tasks.filter(t => t.kind !== "room");
  function taskSection(title: string, tasks: CleaningTask[], area: string) {
    if (technical && !data.assignments.some(a => a.area === area)) return null;
    const visible = tasks.filter(t => !onlyPending || !t.completed_at);
    const finished = tasks.filter(t => t.completed_at).length;
    return <section className="card" key={area}><div className="card-header"><div><h2>{title}</h2><p className="card-subtitle">{data.assignments.filter(a => a.area === area).map(a => a.name).join(" · ") || "Aucune affectation"}</p></div><span className="badge badge-info">{finished} / {tasks.length}</span></div><div className="card-body"><progress aria-label={`Progression ${title}`} value={finished} max={Math.max(tasks.length, 1)} /><div className="cleaning-task-list">{visible.map(t => <div className="cleaning-task" key={t.id}><div><strong>{t.kind === "room" ? `Chambre ${t.target}` : t.target}</strong><span className="row-meta">{periodLabels[t.period]}</span></div><TaskButton task={t} today={today} technical={technical} timezone={timezone} locale={locale} /></div>)}</div>{!visible.length && <p className="empty">{tasks.length ? "Tous les nettoyages de cette zone sont validés." : "Aucune tâche enregistrée pour cette date."}</p>}</div></section>;
  }
  return <>
    <div className="page-intro"><div><h1>{technical ? "Mes nettoyages" : "Gouvernance hôtelière"}</h1><p>{technical ? "Vos chambres et espaces communs, organisés par zone." : "Chambres, équipe, suivi du ménage et prévisions de repas."}</p></div><form className="cleaning-date" action="/portal/housekeeping"><label>Date<input type="date" name="date" required defaultValue={date} /></label><button className="button button-secondary">Consulter</button><button type="button" className="button button-secondary" onClick={() => router.refresh()}>Actualiser</button></form></div>
    {!today && <p className="notice">{date > localToday ? "Les tâches de ménage seront générées le jour concerné. Vous pouvez préparer les affectations et consulter les prévisions de repas." : "Historique des pointages enregistrés. Les jours antérieurs à l’activation du module peuvent ne contenir aucun pointage."}</p>}
    {!data.rosterDate && <p className="notice">Aucune équipe affectée à cette date. Le gouvernant doit enregistrer les affectations.</p>}
    {technical && data.rosterDate && !data.assignments.length && <p className="notice">Aucune zone ne vous est affectée à cette date.</p>}
    {!!data.unmappedRooms && <p className="notice">{data.unmappedRooms} séjour(s) actif(s) associé(s) à une chambre absente du référentiel. À corriger avec l’administrateur ; ces patients restent comptés dans les repas.</p>}
    <div className="metric-grid"><div className="metric"><span>Nettoyages validés</span><strong>{done} / {data.tasks.length}</strong><div className="metric-detail">Actualisation toutes les 30 secondes</div></div><div className="metric"><span>Chambres faites</span><strong>{rooms.filter(t => t.completed_at).length} / {rooms.length}</strong><div className="metric-detail">Un nettoyage quotidien</div></div><div className="metric"><span>Espaces communs</span><strong>{common.filter(t => t.completed_at).length} / {common.length}</strong><div className="metric-detail">Matin, midi et soir</div></div>{!technical && <div className="metric"><span>Chambres occupées / disponibles</span><strong>{data.rooms.filter(r => r.occupied).length} / {data.rooms.filter(r => !r.occupied).length}</strong><div className="metric-detail">{today ? "Occupation actuelle" : "Occupation enregistrée à midi"} · hors propreté</div></div>}</div>
    {!technical && <section className="card"><div className="card-header"><div><h2>Repas à prévoir</h2><p className="card-subtitle">Présence prévue à chaque service, entrées et sorties incluses, permissions autorisées déduites. Horaires de l’établissement.</p></div></div><div className="card-body cleaning-meals">{data.meals.map((meal, i) => <div key={meal.hour}><span>{["Petit-déjeuner", "Déjeuner", "Dîner"][i]} · {meal.hour.slice(0, 5)}</span><strong>{meal.count}</strong><small>repas patients</small></div>)}</div></section>}
    {!technical && date >= localToday && <Assignments key={`${date}-${data.rosterDate}-${JSON.stringify(data.assignments)}`} data={data} date={date} />}
    {!technical && <details className="card housekeeping-roster" open><summary>Chambres disponibles, occupées et mouvements prévus</summary><div className="card-body"><p className="row-meta">Une chambre reste occupée pendant une permission. « Disponible » signifie sans séjour en cours ; vérifier le ménage avant une admission.</p>{[0, 1, 2, 3].map(f => <div key={f}><h3>{floorLabel(f)}</h3><div className="cleaning-room-grid">{data.rooms.filter(r => r.floor === f).map(r => <article key={r.number} className={`cleaning-room ${r.occupied ? "occupied" : "available"}`}><strong>{r.number}</strong><span>{r.occupied ? "Occupée" : "Disponible"}</span>{r.entry && <small>Entrée prévue : {parisDateTime(r.entry, timezone, locale)}</small>}{r.exit && <small>Sortie définitive : {parisDateTime(r.exit, timezone, locale)}</small>}{r.skip && <small>Retour après 24 h d’absence : ménage dispensé</small>}</article>)}</div></div>)}</div></details>}
    <div className="cleaning-section-title"><h2>{today ? "Feuille de ménage" : "Historique du ménage"}</h2><label><input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} /> À faire uniquement</label></div>
    <p className="row-meta">Le référentiel des chambres et l’organisation des étages restent configurables lors de l’onboarding établissement. Les horaires de pointage suivent les paramètres de la clinique.</p>
    <div className="cleaning-zone-grid">{[0, 1, 2, 3].map(f => taskSection(floorLabel(f), data.tasks.filter(t => t.area === `floor-${f}`), `floor-${f}`))}{[1, 2, 3].map(n => taskSection(`Ascenseur ${n}`, data.tasks.filter(t => t.area === `lift-${n}`), `lift-${n}`))}</div>
  </>;
}
