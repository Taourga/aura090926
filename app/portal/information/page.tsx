import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { InformationEditor, MenuEditor } from "@/components/content-editor";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
const meals: Record<string,string> = { breakfast:"Petit-déjeuner", lunch:"Déjeuner", dinner:"Dîner" };

export default async function InformationPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: profile.facility.timezone, year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  const [{ data: posts }, { data: menus }] = await Promise.all([
    supabase.from("information_posts").select("id,title,body,starts_at,ends_at,created_at").eq("published",true).order("created_at",{ascending:false}).limit(12),
    supabase.from("menu_items").select("id,service_date,meal,description").gte("service_date",today).order("service_date").limit(6),
  ]);
  const canEdit = profile.role === "governance" || profile.role === "admin";
  const practical = [
    { icon:"🍽", title:"Repas", strong:"8 h · 12 h · 19 h", text:"Petit-déjeuner, déjeuner et dîner. Le menu est accessible à tout moment." },
    { icon:"🌿", title:"Jardin", strong:"8 h 30 → 19 h 30", text:"Accès selon les consignes de votre unité." },
    { icon:"☀", title:"Patio", strong:"Jusqu’à 22 h", text:"Un espace calme à utiliser dans le respect du repos de chacun." },
    { icon:"↕", title:"Ascenseurs", strong:"Jusqu’à 22 h", text:"Après cet horaire, demandez simplement à l’équipe si vous en avez besoin." },
  ];
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Repères du séjour</div><h1>Informations utiles</h1><p>Les horaires, règles pratiques et annonces importantes, présentés simplement.</p></div></div>
    <section className="info-practical-grid">{practical.map((item)=><div className="info-practical-card" key={item.title}><span>{item.icon}</span><div><small>{item.title}</small><strong>{item.strong}</strong><p>{item.text}</p></div></div>)}</section>
    <div className="dashboard-grid">
      <div className="stack">
        <section className="card"><div className="card-header"><div><h2>À retenir en ce moment</h2><p className="card-subtitle">Les dernières informations publiées par la clinique.</p></div></div><div className="card-body info-post-grid">{posts?.length ? posts.map((post)=><article className="info-post-card" key={post.id}><span className="badge badge-info">Information</span><h3>{post.title}</h3><p>{post.body}</p>{post.ends_at && <small>Valable jusqu’au {formatDate(post.ends_at)}</small>}</article>) : <p className="empty">Aucune information publiée pour le moment.</p>}</div></section>
        <section className="card"><div className="card-header"><div><h2>Prochains repas</h2><p className="card-subtitle">Sous réserve des adaptations individuelles du séjour.</p></div><Link className="button button-secondary button-small" href="/portal/menus">Voir tous les menus</Link></div><div className="card-body"><div className="list">{menus?.length ? menus.map((menu)=><div className="list-row" key={menu.id} style={{gridTemplateColumns:"120px minmax(0,1fr)"}}><div className="time">{formatDate(menu.service_date)}</div><div><div className="row-title">{meals[menu.meal] || menu.meal}</div><div className="row-meta">{menu.description}</div></div></div>) : <p className="empty">Aucun menu publié à venir.</p>}</div></div></section>
      </div>
      {canEdit && <aside className="stack"><section className="card"><div className="card-header"><div><h2>Publier une information</h2></div></div><div className="card-body"><InformationEditor /></div></section><section className="card"><div className="card-header"><div><h2>Mettre à jour un menu</h2></div></div><div className="card-body"><MenuEditor /></div></section></aside>}
    </div>
  </PortalShell>;
}
