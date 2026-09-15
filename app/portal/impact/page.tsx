import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const monthly = [
  { month: "Avr", value: 42 },
  { month: "Mai", value: 55 },
  { month: "Juin", value: 63 },
  { month: "Juil", value: 71 },
  { month: "Août", value: 78 },
  { month: "Sept", value: 86 },
];

const methodology = [
  ["Documents dématérialisés", "Événements numériques AURA comptabilisés dans la simulation de démonstration."],
  ["Pages évitées", "Hypothèse démo : 3 pages papier évitées par document dématérialisé."],
  ["Déplacements évités", "Uniquement lorsqu’un échange numérique peut raisonnablement remplacer un déplacement administratif."],
  ["CO₂e évité", "Estimation démonstrative issue de facteurs paramétrables. Ce chiffre n’est ni certifié ni un bilan carbone réglementaire."],
];

export default async function ImpactPage() {
  const profile = await requireProfile();
  if (!["admin", "governance", "manager"].includes(profile.role)) redirect("/portal");

  const isExecutive = profile.role === "admin" || profile.role === "governance";
  const demoMetrics = {
    digitalDocuments: 1284,
    pagesAvoided: 3852,
    digitalInteractions: 2460,
    avoidedTrips: 74,
    co2Kg: 186,
    maturity: 82,
  };

  return <PortalShell profile={profile}>
    <section className="impact-hero">
      <div>
        <span className="section-kicker">AURA Impact · Démonstration</span>
        <h1>Mesurer l’impact positif du parcours numérique</h1>
        <p>AURA Impact transforme les usages numériques de l’établissement en indicateurs simples de dématérialisation et d’impact environnemental.</p>
      </div>
      <div className="impact-badge"><strong>{demoMetrics.maturity}/100</strong><span>Indice de maturité numérique responsable</span></div>
    </section>

    <div className="impact-notice"><strong>Données de démonstration</strong><span>Les valeurs ci-dessous sont fictives et servent uniquement à illustrer le potentiel du module. Les estimations CO₂e ne constituent pas un bilan carbone certifié.</span></div>

    <section className="impact-grid">
      <article className="impact-kpi"><span>DOCUMENTS NUMÉRIQUES</span><strong>{demoMetrics.digitalDocuments.toLocaleString("fr-FR")}</strong><small>interactions documentaires dématérialisées</small></article>
      <article className="impact-kpi"><span>PAGES ÉVITÉES · EST.</span><strong>{demoMetrics.pagesAvoided.toLocaleString("fr-FR")}</strong><small>selon l’hypothèse de démonstration</small></article>
      <article className="impact-kpi"><span>ÉCHANGES NUMÉRIQUES</span><strong>{demoMetrics.digitalInteractions.toLocaleString("fr-FR")}</strong><small>notifications et échanges AURA</small></article>
      <article className="impact-kpi"><span>DÉPLACEMENTS ÉVITÉS · EST.</span><strong>{demoMetrics.avoidedTrips}</strong><small>déplacements administratifs potentiellement évités</small></article>
      <article className="impact-kpi impact-kpi--primary"><span>CO₂e ÉVITÉ · EST.</span><strong>{demoMetrics.co2Kg} kg</strong><small>simulation non certifiée</small></article>
    </section>

    <section className="impact-panels">
      <article className="impact-card">
        <div className="impact-card-head"><div><span className="section-kicker">Tendance</span><h2>Progression sur 6 mois</h2></div><strong>+44 pts</strong></div>
        <div className="impact-chart" aria-label="Progression mensuelle de l’indice AURA Impact">
          {monthly.map((item) => <div key={item.month} className="impact-bar-row"><span>{item.month}</span><div><i style={{ width: `${item.value}%` }} /></div><strong>{item.value}</strong></div>)}
        </div>
      </article>

      <article className="impact-card">
        <span className="section-kicker">Leviers</span>
        <h2>Ce qui contribue le plus</h2>
        <div className="impact-levers">
          <div><span>Dématérialisation documentaire</span><strong>38%</strong></div>
          <div><span>Notifications & informations patient</span><strong>29%</strong></div>
          <div><span>Coordination interne numérique</span><strong>21%</strong></div>
          <div><span>Échanges administratifs à distance</span><strong>12%</strong></div>
        </div>
      </article>
    </section>

    <section className="impact-card impact-commercial">
      <div><span className="section-kicker">Valeur établissement</span><h2>Un indicateur lisible pour la direction, la qualité et la RSE</h2></div>
      <div className="impact-commercial-grid">
        <div><strong>Mesurer</strong><span>Suivre l’adoption des parcours numériques et les usages réellement réalisés dans AURA.</span></div>
        <div><strong>Réduire</strong><span>Identifier les processus encore très dépendants du papier ou des échanges manuels.</span></div>
        <div><strong>Valoriser</strong><span>Produire des indicateurs communicables en interne dans une démarche numérique responsable.</span></div>
      </div>
    </section>

    {isExecutive && <details className="impact-methodology">
      <summary>Méthodologie & hypothèses de démonstration</summary>
      <div>{methodology.map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}</div>
    </details>}
  </PortalShell>;
}
