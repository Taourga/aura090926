import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RoiData = {
  days: number; permission_requests: number; permission_reviews: number; movements_traced: number; visit_notifications: number; bulletin_requests: number; activity_updates: number; operational_tasks_generated: number; operational_tasks_done: number; active_staff_users: number; avg_permission_approval_minutes: number | null; estimated_self_service_interactions: number;
};

export default async function RoiPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/portal");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aura_roi_dashboard", { p_days: 30 });
  const roi = (data || {}) as RoiData;
  const completionRate = roi.operational_tasks_generated ? Math.round((roi.operational_tasks_done / roi.operational_tasks_generated) * 100) : 0;
  const estimatedMinutesSaved = Math.round((roi.estimated_self_service_interactions || 0) * 4 + (roi.movements_traced || 0) * 2);
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Pilotage direction · 30 derniers jours</div><h1>Pilotage ROI</h1><p>Des volumes réellement mesurés dans AURA, séparés des estimations de temps potentiel afin de garder une lecture crédible pour la direction et les investisseurs.</p></div><div className="page-intro-actions"><Link href="/portal/pulse" className="button button-secondary">Voir l’activité</Link><Link href="/portal/discharges" className="button button-secondary">Suivre les sorties</Link></div></div>
    {error ? <section className="card"><div className="card-body"><p role="alert">Les indicateurs de pilotage n’ont pas pu être chargés. Réessayez depuis l’accueil ou vérifiez les droits d’accès.</p></div></section> : <>
      <section className="roi-hero-grid"><article className="roi-hero-card"><span>Démarches digitalisées</span><strong>{roi.estimated_self_service_interactions || 0}</strong><small>permissions + visites + bulletins</small></article><article className="roi-hero-card"><span>Mouvements tracés</span><strong>{roi.movements_traced || 0}</strong><small>départs et retours</small></article><article className="roi-hero-card"><span>Temps moyen d’approbation</span><strong>{roi.avg_permission_approval_minutes == null ? "—" : `${roi.avg_permission_approval_minutes} min`}</strong><small>double validation</small></article><article className="roi-hero-card"><span>Tâches de sortie terminées</span><strong>{completionRate}%</strong><small>{roi.operational_tasks_done || 0} / {roi.operational_tasks_generated || 0}</small></article></section>
      <section className="roi-grid"><article className="work-card"><div className="work-card-head"><div><p className="section-kicker">Flux mesurés</p><h2>Ce qu’AURA simplifie</h2></div></div><div className="roi-list"><div><span>Demandes de permissions</span><strong>{roi.permission_requests || 0}</strong></div><div><span>Décisions tracées</span><strong>{roi.permission_reviews || 0}</strong></div><div><span>Visites annoncées</span><strong>{roi.visit_notifications || 0}</strong></div><div><span>Bulletins demandés</span><strong>{roi.bulletin_requests || 0}</strong></div><div><span>Modifications d’activités</span><strong>{roi.activity_updates || 0}</strong></div></div></article><article className="work-card"><div className="work-card-head"><div><p className="section-kicker">Coordination mesurée</p><h2>Automatisation</h2></div></div><div className="roi-list"><div><span>Tâches générées</span><strong>{roi.operational_tasks_generated || 0}</strong></div><div><span>Tâches terminées</span><strong>{roi.operational_tasks_done || 0}</strong></div><div><span>Utilisateurs actifs</span><strong>{roi.active_staff_users || 0}</strong></div></div></article><article className="work-card roi-estimate"><div className="work-card-head"><div><p className="section-kicker">Estimation indicative</p><h2>Temps potentiellement rendu</h2></div></div><div className="work-card-body"><strong className="roi-big-estimate">≈ {estimatedMinutesSaved} min</strong><p>Hypothèse de travail : 4 minutes par démarche self-service et 2 minutes par mouvement tracé.</p><small>Ce chiffre n’est pas un gain mesuré. Il devra être confronté aux données du pilote avant toute communication commerciale.</small></div></article></section>
    </>}
  </PortalShell>;
}
