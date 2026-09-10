import { PortalShell } from "@/components/portal-shell";
import { InformationEditor, MenuEditor } from "@/components/content-editor";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const meals: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", dinner: "Dîner" };

export default async function InformationPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: posts }, { data: menus }] = await Promise.all([
    supabase.from("information_posts").select("id, title, body, starts_at, ends_at, created_at").eq("published", true).order("created_at", { ascending: false }).limit(20),
    supabase.from("menu_items").select("id, service_date, meal, description").gte("service_date", today).order("service_date").limit(6),
  ]);
  const canEdit = profile.role === "governance" || profile.role === "admin";
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Informations de la clinique</h1><p>Consignes pratiques et annonces importantes pendant le séjour.</p></div></div>
    <div className="dashboard-grid">
      <div className="stack">
        <section className="card"><div className="card-header"><div><h2>Informations utiles</h2><p className="card-subtitle">Messages publiés par la clinique</p></div></div><div className="card-body"><div className="list">{posts?.length ? posts.map((post) => <div className="list-row" key={post.id} style={{ gridTemplateColumns: "1fr" }}><div><div className="row-title">{post.title}</div><div className="row-meta">{post.body}</div></div></div>) : <p className="empty">Aucune information publiée pour le moment.</p>}</div></div></section>
        <section className="card"><div className="card-header"><div><h2>Aperçu des menus</h2><p className="card-subtitle">Sous réserve des adaptations individuelles du séjour.</p></div><Link className="button button-secondary button-small" href="/portal/menus">Voir la semaine</Link></div><div className="card-body"><div className="list">{menus?.length ? menus.map((menu) => <div className="list-row" key={menu.id} style={{ gridTemplateColumns: "130px minmax(0,1fr)" }}><div className="time">{formatDate(menu.service_date)}</div><div><div className="row-title">{meals[menu.meal] || menu.meal}</div><div className="row-meta">{menu.description}</div></div></div>) : <p className="empty">Aucun menu publié à venir.</p>}</div></div></section>
      </div>
      {canEdit && <aside className="stack"><section className="card"><div className="card-header"><div><h2>Publier une information</h2></div></div><div className="card-body"><InformationEditor /></div></section><section className="card"><div className="card-header"><div><h2>Mettre à jour un menu</h2></div></div><div className="card-body"><MenuEditor /></div></section></aside>}
    </div>
  </PortalShell>;
}
