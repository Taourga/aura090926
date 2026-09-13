import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const allowed = ["admin", "manager", "governance", "doctor"];

type RoiData = {
  days: number;
  permission_requests: number;
  permission_reviews: number;
  movements_traced: number;
  visit_notifications: number;
  bulletin_requests: number;
  activity_updates: number;
  operational_tasks_generated: number;
  operational_tasks_done: number;
  active_staff_users: number;
  avg_permission_approval_minutes: number | null;
  estimated_self_service_interactions: number;
};

export default async function RoiPage() {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aura_roi_dashboard", { p_days: 30 });
  const roi = (data || {}) as RoiData;
  const completionRate = roi.operational_tasks_generated ? Math.round((roi.operational_tasks_done / roi.operational_tasks_generated) * 100) : 0;
  const estimatedMinutesSaved = Math.round((roi.estimated_self_service_interactions || 0) * 4 + (roi.movements_traced || 0) * 2);

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">AURA ROI</div><h1>La valeur opérationnelle devient mesurable</h1><p>Indicateurs des 30 derniers jours. Les mesures factuelles sont séparées des estimations pour rester crédibles face à une direction.</p></div></div>

    {error ? <section className="card"><div className="card-body"><p role="alert">Les indicateurs ROI n’ont pas pu être chargés.</p></div></section> : <>
      <section className="roi-hero-grid">
        <article className="roi-hero-card"><span>Démarches patient digitalisées</span><strong>{roi.estimated_self_service_interactions || 0}</strong><small>permissions + visites + bulletins</small></article>
        <article className="roi-hero-card"><span>Mouvements tracés</span><strong>{roi.movements_traced || 0}</strong><small>départs et retours enregistrés</small></article>
        <article className="roi-hero-card"><span>Temps moyen d’approbation</span><strong>{roi.avg_permission_approval_minutes == null ? "—" : `${roi.avg_permission_approval_minutes} min`}</strong><small>permissions avec double validation</small></article>
        <article className="roi-hero-card"><span>Tâches de sortie terminées</span><strong>{completionRate}%</strong><small>{roi.operational_tasks_done || 0} / {roi.operational_tasks_generated || 0}</small></article>
      </section>

      <section className="roi-grid">
        <article className="work-card"><div className="work-card-head"><div><p className="section-kicker">Flux digitalisés</p><h2>Ce qu’AURA remplace ou simplifie</h2></div></div><div className="roi-list">
          <div><span>Demandes de permissions</span><strong>{roi.permission_requests || 0}</strong></div>
          <div><span>Décisions de permission tracées</span><strong>{roi.permission_reviews || 0}</strong></div>
          <div><span>Visites annoncées en ligne</span><strong>{roi.visit_notifications || 0}</strong></div>
          <div><span>Bulletins demandés en ligne</span><strong>{roi.bulletin_requests || 0}</strong></div>
          <div><span>Modifications d’activités communiquées</span><strong>{roi.activity_updates || 0}</strong></div>
        </div></article>

        <article className="work-card"><div className="work-card-head"><div><p className="section-kicker">Coordination</p><h2>Automatisation inter-services</h2></div></div><div className="roi-list">
          <div><span>Tâches générées automatiquement</span><strong>{roi.operational_tasks_generated || 0}</strong></div>
          <div><span>Tâches terminées</span><strong>{roi.operational_tasks_done || 0}</strong></div>
          <div><span>Utilisateurs actifs tracés</span><strong>{roi.active_staff_users || 0}</strong></div>
        </div></article>

        <article className="work-card roi-estimate"><div className="work-card-head"><div><p className="section-kicker">Estimation commerciale</p><h2>Temps potentiellement rendu aux équipes</h2></div></div><div className="work-card-body"><strong className="roi-big-estimate">≈ {estimatedMinutesSaved} min</strong><p>Estimation indicative sur 30 jours, calculée avec une hypothèse simple : 4 minutes économisées par démarche patient passée en self-service et 2 minutes par mouvement tracé numériquement.</p><small>Cette estimation n’est pas présentée comme un gain mesuré. Pendant un pilote, AURA ROI pourra comparer les temps réels avant/après.</small></div></article>
      </section>
    </>}
  </PortalShell>;
}
