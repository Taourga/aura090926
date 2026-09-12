import Link from "next/link";

const roles = [
  {
    code: "01",
    title: "Patient",
    headline: "Je sais ce qui m'attend aujourd'hui.",
    points: ["Planning clair", "Permission de sortie", "Activités & visites"],
  },
  {
    code: "02",
    title: "Médecin & cadre",
    headline: "Je valide sans papier ni relance.",
    points: ["Double validation", "Vue séjour", "Décisions horodatées"],
  },
  {
    code: "03",
    title: "Accueil",
    headline: "Je sais qui est présent, sorti ou revenu.",
    points: ["Départ réel", "Retour réel", "Visiteurs attendus"],
  },
  {
    code: "04",
    title: "Direction",
    headline: "Je pilote l'établissement, pas des fichiers Excel.",
    points: ["Rôles & modules", "Multi-clinique", "Country Pack FR / DZ"],
  },
];

export default function DemoPage() {
  return (
    <main className="landing landing-v2">
      <header className="topbar topbar-v2">
        <Link className="brand" href="/"><span className="brand-mark">A</span>AURA</Link>
        <nav className="public-nav" aria-label="Navigation démo">
          <a href="#roles">Les rôles</a>
          <a href="#permission">Workflow</a>
          <Link className="button button-primary" href="/login">Tester avec un compte</Link>
        </nav>
      </header>

      <section className="hero hero-v2">
        <div className="hero-copy">
          <div className="eyebrow">Démo commerciale · données fictives</div>
          <h1>Un séjour patient visible de bout en bout.</h1>
          <p className="hero-lead">AURA relie le patient, les soignants, l'accueil et les opérations autour des moments qui font perdre du temps : planning, permissions, mouvements, visites et informations de séjour.</p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="#roles">Voir AURA par rôle</a>
            <a className="button button-secondary button-large" href="#permission">Voir le workflow permission</a>
          </div>
          <div className="market-chips"><span>AURA Core</span><span>France</span><span>Algérie</span><span>Multi-clinique</span></div>
        </div>

        <div className="product-preview" aria-label="Aperçu opérationnel">
          <div className="preview-top"><div><span className="preview-kicker">Aujourd'hui</span><strong>Vue séjour · Clinique AURA Démo</strong></div><span className="badge badge-success"><span className="status-dot"/>Temps réel</span></div>
          <div className="preview-grid">
            <div className="preview-card preview-card-main"><span>08:45</span><strong>Patient présent</strong><small>Chambre 214 · planning à jour</small></div>
            <div className="preview-card"><span>10:30</span><strong>Entretien psychologue</strong><small>Salle 2 · 45 min</small></div>
            <div className="preview-card"><span>Permission</span><strong>Médecin ✓ · Cadre ✓</strong><small>Départ autorisé à 14:00</small></div>
            <div className="preview-card"><span>Accueil</span><strong>Retour attendu 18:00</strong><small>Mouvement horodaté</small></div>
          </div>
          <div className="preview-footer"><span className="status-dot"/>Une seule information, visible par le bon rôle au bon moment.</div>
        </div>
      </section>

      <section id="roles" className="public-section">
        <div className="section-heading"><div className="eyebrow">Une interface par métier</div><h2>Chacun voit uniquement ce dont il a besoin.</h2><p>Moins d'écrans, moins de clics, moins d'appels. Le produit s'adapte au rôle et aux modules activés par l'établissement.</p></div>
        <div className="benefit-grid">
          {roles.map((role) => <article className="benefit-card" key={role.title}>
            <span>{role.code}</span>
            <h3>{role.title}</h3>
            <p><strong>{role.headline}</strong></p>
            <p style={{ marginTop: 12 }}>{role.points.join(" · ")}</p>
          </article>)}
        </div>
      </section>

      <section id="permission" className="public-section public-section-soft">
        <div className="section-heading"><div className="eyebrow">Exemple clé</div><h2>Une permission sans papier, sans zone grise.</h2><p>Le workflow reste simple pour l'utilisateur et traçable pour l'établissement.</p></div>
        <div className="journey-grid">
          <article><span>1</span><div><h3>Le patient demande</h3><p>Date, heure de retour et motif éventuel.</p></div></article>
          <article><span>2</span><div><h3>Le médecin décide</h3><p>Validation ou refus, avec horodatage.</p></div></article>
          <article><span>3</span><div><h3>Le cadre confirme</h3><p>La sortie n'est autorisée qu'après les deux validations.</p></div></article>
          <article><span>4</span><div><h3>L'accueil trace</h3><p>Départ réel, retour réel et visibilité instantanée.</p></div></article>
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading"><div className="eyebrow">Positionnement</div><h2>AURA ne remplace pas le dossier médical.</h2><p>Il orchestre le séjour quotidien autour du SI existant : patient, équipes, planning, autorisations, mouvements et vie de l'établissement.</p></div>
        <div className="proof-strip"><span>Mobile-first</span><b>•</b><span>Multi-rôles</span><b>•</b><span>Multi-clinique</span><b>•</b><span>FR / DZ</span><b>•</b><span>Workflow auditable</span></div>
      </section>

      <section className="sales-cta">
        <div><div className="eyebrow">Démo terminée</div><h2>Le prochain écran, c'est celui de votre clinique.</h2><p>Le pilote se configure par établissement : modules, rôles, règles de permission, visites, fuseau, langue et Country Pack.</p></div>
        <Link className="button button-primary button-large" href="/login">Accéder à AURA</Link>
      </section>

      <footer className="public-footer"><Link className="brand" href="/"><span className="brand-mark">A</span>AURA</Link><p>Démo commerciale · aucune donnée patient réelle</p></footer>
    </main>
  );
}
