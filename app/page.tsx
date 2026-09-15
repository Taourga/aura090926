import Link from "next/link";
import { AuraCopy } from "@/components/aura-copy";

const impactMetrics = [
  ["PAGES ÉVITÉES · EST.", "3 852", "papier potentiellement évité"],
  ["ÉCHANGES NUMÉRIQUES", "2 460", "notifications et échanges AURA"],
  ["DÉPLACEMENTS ÉVITÉS · EST.", "74", "démarches administratives"],
  ["CO₂e ÉVITÉ · EST.", "186 kg", "simulation non certifiée"],
];

const journey = [
  ["Patient", "Consulte son séjour et fait ses demandes."],
  ["Soignants", "Valident et mettent à jour les informations utiles."],
  ["Accueil", "Enregistre les mouvements réels."],
  ["Direction", "Suit l’activité avec une vue opérationnelle commune."],
];

export default function HomePage() {
  return (
    <main className="landing landing-v2 landing-simplified">
      <header className="topbar topbar-v2">
        <Link href="/" className="brand"><span className="brand-mark">A</span><span>AURA</span></Link>
        <nav className="public-nav" aria-label="Navigation publique">
          <a href="#solution">Solution</a>
          <a href="#impact">Impact</a>
          <Link href="/demo">Démo</Link>
          <Link className="button button-secondary" href="/login">Se connecter</Link>
        </nav>
      </header>

      <section className="hero hero-v2 hero-simplified">
        <div className="hero-copy">
          <div className="eyebrow">AURA · orchestration du séjour patient</div>
          <h1><AuraCopy id="heroTitle" /></h1>
          <p className="hero-lead"><AuraCopy id="heroLead" /></p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="mailto:contact@auradh.com?subject=Demande%20de%20d%C3%A9monstration%20AURA"><AuraCopy id="requestDemo" /></a>
            <Link className="button button-secondary button-large" href="/demo"><AuraCopy id="discoverTwoMinutes" /></Link>
          </div>
          <div className="market-chips" aria-label="Marchés AURA">
            <span>AURA Core</span><span>France</span><span>Algérie</span><span>Multi-établissements</span>
          </div>
        </div>

        <div className="product-preview product-preview-simplified" aria-label="Aperçu d’AURA">
          <div className="preview-top">
            <div><span className="preview-kicker">Aujourd’hui</span><strong>Le séjour en un coup d’œil</strong></div>
            <span className="badge badge-success"><span className="status-dot"/>Temps réel</span>
          </div>
          <div className="preview-grid">
            <article className="preview-card preview-card-main"><span>10:30</span><strong>Entretien psychologue</strong><small>Salle 214 · 45 min</small></article>
            <article className="preview-card"><span>Permission</span><strong>Double validation</strong><small>Médecin + cadre</small></article>
            <article className="preview-card"><span>Présence</span><strong>Temps réel</strong><small>Départ et retour tracés</small></article>
            <article className="preview-card preview-card-impact"><span>Impact</span><strong>3 852 pages</strong><small>évitées · estimation démo</small></article>
          </div>
          <div className="preview-footer"><span className="status-dot"/> Informations partagées selon le rôle de chacun</div>
        </div>
      </section>

      <section className="public-value-band" aria-label="Valeur AURA">
        <div><strong><AuraCopy id="pillarPatientTitle" /></strong><span><AuraCopy id="pillarPatientText" /></span></div>
        <div><strong><AuraCopy id="pillarTeamTitle" /></strong><span><AuraCopy id="pillarTeamText" /></span></div>
        <div><strong><AuraCopy id="pillarPerformanceTitle" /></strong><span><AuraCopy id="pillarPerformanceText" /></span></div>
        <div><strong><AuraCopy id="pillarImpactTitle" /></strong><span><AuraCopy id="pillarImpactText" /></span></div>
      </section>

      <section id="solution" className="public-section public-section-simplified">
        <div className="section-heading"><span className="eyebrow">Solution</span><h2><AuraCopy id="valueTitle" /></h2><p><AuraCopy id="valueLead" /></p></div>
        <div className="public-pillars">
          <article><span>01</span><h3><AuraCopy id="pillarPatientTitle" /></h3><p><AuraCopy id="pillarPatientText" /></p></article>
          <article><span>02</span><h3><AuraCopy id="pillarTeamTitle" /></h3><p><AuraCopy id="pillarTeamText" /></p></article>
          <article><span>03</span><h3><AuraCopy id="pillarPerformanceTitle" /></h3><p><AuraCopy id="pillarPerformanceText" /></p></article>
          <article><span>04</span><h3><AuraCopy id="pillarImpactTitle" /></h3><p><AuraCopy id="pillarImpactText" /></p></article>
        </div>
      </section>

      <section id="impact" className="public-section public-impact-section">
        <div className="public-impact-copy">
          <span className="eyebrow">AURA Impact</span>
          <h2>Mesurer l’impact positif du parcours numérique</h2>
          <p><AuraCopy id="impactLead" /></p>
          <div className="impact-demo-note"><strong>Données de démonstration</strong><span><AuraCopy id="demoDataNote" /></span></div>
        </div>
        <div className="public-impact-metrics">
          {impactMetrics.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
        </div>
      </section>

      <section id="fonctionnement" className="public-section public-section-soft public-section-simplified">
        <div className="section-heading"><span className="eyebrow">Un fonctionnement évident</span><h2>Chacun voit uniquement ce dont il a besoin.</h2></div>
        <div className="journey-grid journey-grid-simplified">
          {journey.map(([title, text], index) => <article key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}
        </div>
      </section>

      <section className="sales-cta sales-cta-simplified">
        <div><span className="eyebrow">AURA FR · AURA DZ</span><h2><AuraCopy id="pilotTitle" /></h2><p><AuraCopy id="pilotLead" /></p></div>
        <a className="button button-primary button-large" href="mailto:contact@auradh.com?subject=Pilote%20AURA"><AuraCopy id="requestDemo" /></a>
      </section>

      <footer className="public-footer public-footer-simplified"><div className="brand"><span className="brand-mark">A</span>AURA</div><p>Plateforme d’orchestration du séjour patient · contact@auradh.com</p></footer>
    </main>
  );
}
