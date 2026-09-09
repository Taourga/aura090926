import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">A</span>AURA</div>
        <Link className="button button-primary" href="/login">Se connecter</Link>
      </header>
      <section className="hero">
        <div>
          <div className="eyebrow">Portail de séjour sécurisé</div>
          <h1>Un séjour plus simple, pour les patients comme pour les équipes.</h1>
          <p>Consultez le planning, les activités et les informations pratiques. Gérez les permissions de sortie et les rendez-vous dans un espace clair et sécurisé.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/login">Accéder à mon espace</Link>
            <a className="button button-secondary" href="#services">Découvrir les services</a>
          </div>
        </div>
        <div className="hero-card" aria-label="Aperçu du portail">
          <div className="hero-card-head"><div><strong>Votre journée</strong><div className="row-meta">Mardi 9 septembre</div></div><span className="badge badge-success"><span className="status-dot"/>Présent</span></div>
          <div className="hero-list">
            <div className="hero-item"><span className="hero-icon">◷</span><div><strong>10:30 · Entretien psychologue</strong><p>Salle 214 · Durée estimée : 45 min</p></div></div>
            <div className="hero-item"><span className="hero-icon">◌</span><div><strong>15:00 · Relaxation</strong><p>Salle d&apos;activité · Inscription confirmée</p></div></div>
            <div className="hero-item"><span className="hero-icon">↗</span><div><strong>Permission de sortie</strong><p>En attente de validation</p></div></div>
          </div>
        </div>
      </section>
      <section id="services" className="value-strip">
        <div className="value"><h2>Mon planning</h2><p>Rendez-vous, activités et permissions dans une vue quotidienne facile à lire.</p></div>
        <div className="value"><h2>Mes demandes</h2><p>Une permission est autorisée uniquement après l&apos;accord du médecin et du cadre.</p></div>
        <div className="value"><h2>La vie de la clinique</h2><p>Menus, activités et informations de séjour, mis à jour par l&apos;établissement.</p></div>
      </section>
    </main>
  );
}
