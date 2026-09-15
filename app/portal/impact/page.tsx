import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { AuraCopy } from "@/components/aura-copy";
import { facilitySettingNumber, requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const monthly = [
  { month: "Avr", value: 42 },
  { month: "Mai", value: 55 },
  { month: "Juin", value: 63 },
  { month: "Juil", value: 71 },
  { month: "Août", value: 78 },
  { month: "Sept", value: 86 },
];

export default async function ImpactPage() {
  const profile = await requireProfile();
  if (!["admin", "governance", "manager"].includes(profile.role)) redirect("/portal");

  const isExecutive = profile.role === "admin" || profile.role === "governance";
  const digitalDocuments = Math.max(0, Math.round(facilitySettingNumber(profile, "impact.digital_documents", 1284)));
  const digitalInteractions = Math.max(0, Math.round(facilitySettingNumber(profile, "impact.digital_interactions", 2460)));
  const avoidedTrips = Math.max(0, Math.round(facilitySettingNumber(profile, "impact.avoided_trips", 74)));
  const pagesPerDocument = Math.max(0, facilitySettingNumber(profile, "impact.pages_per_document", 3));
  const co2KgPerDocument = Math.max(0, facilitySettingNumber(profile, "impact.co2_kg_per_document", 0.145));
  const maturity = Math.min(100, Math.max(0, Math.round(facilitySettingNumber(profile, "impact.maturity", 82))));
  const demoMetrics = {
    digitalDocuments,
    pagesAvoided: Math.round(digitalDocuments * pagesPerDocument),
    digitalInteractions,
    avoidedTrips,
    co2Kg: Math.round(digitalDocuments * co2KgPerDocument),
    maturity,
  };
  const methodology = [
    ["Documents dématérialisés", "Événements numériques AURA comptabilisés dans le périmètre du module."],
    ["Pages évitées", `Facteur actif : ${pagesPerDocument.toLocaleString("fr-FR")} page(s) papier potentiellement évitée(s) par document dématérialisé.`],
    ["Déplacements évités", "Comptabilisés uniquement lorsqu’un échange numérique peut raisonnablement remplacer un déplacement administratif."],
    ["CO₂e évité", `Facteur actif : ${co2KgPerDocument.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg CO₂e par document. Estimation paramétrable, non certifiée et distincte d’un bilan carbone réglementaire.`],
  ];

  return <PortalShell profile={profile}>
    <section className="impact-hero impact-hero-simplified">
      <div>
        <span className="section-kicker">AURA Impact · Méthodologie paramétrable</span>
        <h1><AuraCopy id="performanceImpactTitle" /></h1>
        <p><AuraCopy id="performanceImpactLead" /></p>
        <div className="impact-hero-actions">
          <Link href="/portal/pulse" className="button button-secondary">Voir l’activité</Link>
          {profile.role === "admin" && <Link href="/portal/roi" className="button button-primary">Pilotage ROI</Link>}
        </div>
      </div>
      <div className="impact-badge"><strong>{demoMetrics.maturity}/100</strong><span>Indice de maturité numérique responsable</span></div>
    </section>

    <section className="impact-value-row" aria-label="Valeur AURA Impact">
      <article><strong><AuraCopy id="impactOps" /></strong><span><AuraCopy id="impactOpsText" /></span></article>
      <article><strong><AuraCopy id="impactRse" /></strong><span><AuraCopy id="impactRseText" /></span></article>
      <article><strong><AuraCopy id="impactDirection" /></strong><span><AuraCopy id="impactDirectionText" /></span></article>
    </section>

    <div className="impact-notice"><strong>Données de démonstration</strong><span>Les volumes restent fictifs dans la démo. Les facteurs de calcul sont maintenant lus depuis la configuration de l’établissement afin d’être recalibrés lors d’un pilote.</span></div>

    <section className="impact-grid">
      <article className="impact-kpi"><span>DOCUMENTS NUMÉRIQUES</span><strong>{demoMetrics.digitalDocuments.toLocaleString("fr-FR")}</strong><small>interactions documentaires dématérialisées</small></article>
      <article className="impact-kpi"><span>PAGES ÉVITÉES · EST.</span><strong>{demoMetrics.pagesAvoided.toLocaleString("fr-FR")}</strong><small>{pagesPerDocument.toLocaleString("fr-FR")} page(s) / document</small></article>
      <article className="impact-kpi"><span>ÉCHANGES NUMÉRIQUES</span><strong>{demoMetrics.digitalInteractions.toLocaleString("fr-FR")}</strong><small>notifications et échanges AURA</small></article>
      <article className="impact-kpi"><span>DÉPLACEMENTS ÉVITÉS · EST.</span><strong>{demoMetrics.avoidedTrips}</strong><small>déplacements administratifs potentiellement évités</small></article>
      <article className="impact-kpi impact-kpi--primary"><span>CO₂e ÉVITÉ · EST.</span><strong>{demoMetrics.co2Kg} kg</strong><small>facteur paramétrable · non certifié</small></article>
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
        <div><strong>Calibrer</strong><span>Ajuster les facteurs de calcul au contexte réel de l’établissement avant toute communication externe.</span></div>
      </div>
    </section>

    {isExecutive && <details className="impact-methodology">
      <summary>Méthodologie & facteurs actifs</summary>
      <div>{methodology.map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}</div>
    </details>}
  </PortalShell>;
}
