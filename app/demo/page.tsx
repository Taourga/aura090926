import Link from "next/link";
import { AuraCopy } from "@/components/aura-copy";

const roles = [
  { code: "01", title: "Patient", headline: "Je sais ce qui m'attend aujourd'hui.", points: ["Planning clair", "Permission de sortie", "Activités & visites"] },
  { code: "02", title: "Médecin & cadre", headline: "Je valide sans papier ni relance.", points: ["Double validation", "Vue séjour", "Décisions horodatées"] },
  { code: "03", title: "Accueil", headline: "Je sais qui est présent, sorti ou revenu.", points: ["Départ réel", "Retour réel", "Visiteurs attendus"] },
  { code: "04", title: "Direction", headline: "Je pilote l'établissement, pas des fichiers Excel.", points: ["AURA Pulse", "Pilotage ROI", "AURA Impact"] },
];

const impactMetrics = [
  ["PAGES ÉVITÉES · EST.", "3 852"],
  ["ÉCHANGES NUMÉRIQUES", "2 460"],
  ["DÉPLACEMENTS ÉVITÉS · EST.", "74"],
  ["CO₂e ÉVITÉ · EST.", "186 kg"],
];

export default function DemoPage() {
  return (
    <main className="landing landing-v2 landing-simplified">
      <header className="topbar topbar-v2">
        <Link className="brand" href="/"><span className="brand-mark">A</span>AURA</Link>
        <nav className="public-nav" aria-label="Navigation démo">
          <a href="#gains">Valeur</a>
          <a href="#roles">Les rôles</a>
          <a href="#impact">Impact</a>
          <Link className="button button-secondary" href="/login">Tester avec un compte</Link>
        </nav>
      </header>

      <section className="hero hero-v2 hero-simplified">
        <div className="hero-copy">
          <div className="eyebrow">Démo commerciale · données fictives</div>
          <h1><AuraCopy id="demoTitle" /></h1>
          <p className="hero-lead"><AuraCopy id="demoLead" /></p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="#gains"><AuraCopy id="demoGainTitle" /></a>
            <a className="button button-secondary button-large" href="#impact">AURA Impact</a>
          </div>
          <div className="market-chips"><span>AURA Core</span><span>France</span><span>Algérie</span><span>Multi-clinique</span></div>
        </div>

        <div className="product-preview product-preview-simplified" aria-label="Aperçu opérationnel">
          <div className="preview-top"><div><span className="preview-kicker">Aujourd'hui</span><strong>Vue séjour · Clinique AURA Démo</strong></div><span className="badge badge-success"><span className="status-dot"/>Temps réel</span></div>
          <div className="preview-grid">
            <div className="preview-card preview-card-main"><span>08:45</span><strong>Patient présent</strong><small>Chambre 214 · planning à jour</small></div>
            <div className="preview-card"><span>Permission</span><strong>Médecin ✓ · Cadre ✓</strong><small>Départ autorisé à 14:00</small></div>
            <div className="preview-card"><span>Accueil</span><strong>Retour attendu 18:00</strong><small>Mouvement horodaté</small></div>
            <div className="preview-card preview-card-impact"><span>AURA Impact</span><strong>186 kg CO₂e</strong><small>évité · estimation démo</small></div>
          </div>
          <div className="preview-footer"><span className="status-dot"/>Une seule information, visible par le bon rôle au bon moment.</div>
        </div>
      </section>

      <section id="gains" className="public-section public-section-simplified">
        <div className="section-heading"><div className="eyebrow">Valeur établissement</div><h2><AuraCopy id="demoGainTitle" /></h2><p><AuraCopy id="valueLead" /></p></div>
        <div className="public-pillars">
          <article><span>01</span><h3><AuraCopy id="pillarPatientTitle" /></h3><p><AuraCopy id="pillarPatientText" /></p></article>
          <article><span>02</span><h3><AuraCopy id="pillarTeamTitle" /></h3><p><AuraCopy id="pillarTeamText" /></p></article>
          <article><span>03</span><h3><AuraCopy id="pillarPerformanceTitle" /></h3><p><AuraCopy id="pillarPerformanceText" /></p></article>
          <article><span>04</span><h3><AuraCopy id="pillarImpactTitle" /></h3><p><AuraCopy id="pillarImpactText" /></p></article>
        </div>
      </section>

      <section id="roles" className="public-section public-section-soft public-section-simplified">
        <div className="section-heading"><div className="eyebrow">Une interface par métier</div><h2>Chacun voit uniquement ce dont il a besoin.</h2><p>Moins d'écrans, moins de clics, moins d'appels. Les services secondaires restent disponibles sans encombrer la navigation principale.</p></div>
        <div className="benefit-grid benefit-grid-simplified">
          {roles.map((role) => <article className="benefit-card" key={role.title}><span>{role.code}</span><h3>{role.title}</h3><p><strong>{role.headline}</strong></p><p>{role.points.join(" · ")}</p></article>)}
        </div>
      </section>

      <section id="impact" className="public-section public-impact-section public-impact-section-demo">
        <div className="public-impact-copy">
          <span className="eyebrow">AURA Impact</span>
          <h2><AuraCopy id="performanceImpactTitle" /></h2>
          <p><AuraCopy id="impactLead" /></p>
          <div className="impact-demo-note"><strong>Données de démonstration</strong><span><AuraCopy id="demoDataNote" /></span></div>
        </div>
        <div className="public-impact-metrics">
          {impactMetrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>simulation AURA</small></article>)}
        </div>
      </section>

      <section id="permission" className="public-section public-section-simplified">
        <div className="section-heading"><div className="eyebrow">Exemple clé</div><h2>Une permission sans papier, sans zone grise.</h2><p>Le workflow reste simple pour l'utilisateur et traçable pour l'établissement.</p></div>
        <div className="journey-grid journey-grid-simplified">
          <article><span>1</span><div><h3>Le patient demande</h3><p>Date, heure de retour et motif éventuel.</p></div></article>
          <article><span>2</span><div><h3>Le médecin décide</h3><p>Validation ou refus, avec horodatage.</p></div></article>
          <article><span>3</span><div><h3>Le cadre confirme</h3><p>La sortie n'est autorisée qu'après les deux validations.</p></div></article>
          <article><span>4</span><div><h3>L'accueil trace</h3><p>Départ réel, retour réel et visibilité instantanée.</p></div></article>
        </div>
      </section>

      <section className="sales-cta sales-cta-simplified">
        <div><div className="eyebrow">Démo terminée</div><h2><AuraCopy id="pilotTitle" /></h2><p><AuraCopy id="pilotLead" /></p></div>
        <a className="button button-primary button-large" href="mailto:contact@auradh.com?subject=Pilote%20AURA"><AuraCopy id="requestDemo" /></a>
      </section>

      <footer className="public-footer public-footer-simplified"><Link className="brand" href="/"><span className="brand-mark">A</span>AURA</Link><p>Démo commerciale · aucune donnée patient réelle · contact@auradh.com</p></footer>
    </main>
  );
}
