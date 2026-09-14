import Link from "next/link";

const benefits = [
  { icon: "01", title: "Un seul planning", text: "Rendez-vous, activités, visites et informations de séjour réunis dans un espace clair." },
  { icon: "02", title: "Des permissions maîtrisées", text: "Demande patient, double validation, départ et retour réels : chaque étape est tracée." },
  { icon: "03", title: "Une présence visible", text: "Les équipes savent qui est présent, sorti ou attendu, sans multiplier les appels." },
  { icon: "04", title: "Un produit adaptable", text: "AURA Core s’adapte aux établissements français et algériens sans dupliquer le logiciel." },
];

const steps = [
  ["Patient", "Consulte son séjour et fait ses demandes."],
  ["Soignants", "Valident et mettent à jour les informations utiles."],
  ["Accueil", "Enregistre les mouvements réels."],
  ["Direction", "Suit l’activité avec une vue opérationnelle commune."],
];

export default function HomePage() {
  return (
    <main className="landing landing-v2">
      <header className="topbar topbar-v2">
        <Link href="/" className="brand"><span className="brand-mark">A</span><span>AURA</span></Link>
        <nav className="public-nav" aria-label="Navigation publique">
          <a href="#solution">Solution</a>
          <a href="#fonctionnement">Fonctionnement</a>
          <Link href="/demo">Démo</Link>
          <Link className="button button-primary" href="/login">Se connecter</Link>
        </nav>
      </header>

      <section className="hero hero-v2">
        <div className="hero-copy">
          <div className="eyebrow">AURA · orchestration du séjour patient</div>
          <h1>Le séjour patient, simple à suivre. Simple à piloter.</h1>
          <p className="hero-lead">AURA relie le patient, les soignants, l’accueil et les équipes opérationnelles dans un même parcours : planning, permissions, présence, visites, activités et informations utiles.</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/login">Accéder à AURA</Link>
            <Link className="button button-secondary button-large" href="/demo">Voir la démo guidée</Link>
          </div>
          <div className="market-chips" aria-label="Marchés AURA">
            <span>AURA Core</span><span>France</span><span>Algérie</span><span>Multi-établissements</span>
          </div>
        </div>

        <div className="product-preview" aria-label="Aperçu d’AURA">
          <div className="preview-top">
            <div><span className="preview-kicker">Aujourd’hui</span><strong>Le séjour en un coup d’œil</strong></div>
            <span className="badge badge-success"><span className="status-dot"/>Présent</span>
          </div>
          <div className="preview-grid">
            <article className="preview-card preview-card-main"><span>10:30</span><strong>Entretien psychologue</strong><small>Salle 214 · 45 min</small></article>
            <article className="preview-card"><span>15:00</span><strong>Relaxation</strong><small>Inscription confirmée</small></article>
            <article className="preview-card"><span>Permission</span><strong>Double validation</strong><small>Médecin + cadre</small></article>
            <article className="preview-card"><span>Présence</span><strong>Temps réel</strong><small>Départ et retour tracés</small></article>
          </div>
          <div className="preview-footer"><span className="status-dot"/> Informations partagées selon le rôle de chacun</div>
        </div>
      </section>

      <section className="proof-strip" aria-label="Principes AURA">
        <span>Patient</span><b>→</b><span>Soins</span><b>→</b><span>Accueil</span><b>→</b><span>Opérations</span><b>→</b><span>Direction</span>
      </section>

      <section id="solution" className="public-section">
        <div className="section-heading"><span className="eyebrow">Une interface, quatre bénéfices</span><h2>Moins de friction. Plus de visibilité.</h2><p>AURA ne remplace pas le dossier médical. Il organise le parcours quotidien autour du séjour.</p></div>
        <div className="benefit-grid">
          {benefits.map((item) => <article className="benefit-card" key={item.title}><span>{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </section>

      <section id="fonctionnement" className="public-section public-section-soft">
        <div className="section-heading"><span className="eyebrow">Un fonctionnement évident</span><h2>Chacun voit uniquement ce dont il a besoin.</h2></div>
        <div className="journey-grid">
          {steps.map(([title, text], index) => <article key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}
        </div>
      </section>

      <section className="sales-cta">
        <div><span className="eyebrow">AURA FR · AURA DZ</span><h2>Un même cœur produit, configuré pour chaque établissement.</h2><p>Modules, règles métier, rôles, fuseau horaire et parcours peuvent être adaptés sans créer un logiciel différent pour chaque clinique.</p></div>
        <Link className="button button-primary button-large" href="/login">Ouvrir AURA</Link>
      </section>

      <footer className="public-footer"><div className="brand"><span className="brand-mark">A</span>AURA</div><p>Plateforme d’orchestration du séjour patient.</p></footer>
    </main>
  );
}