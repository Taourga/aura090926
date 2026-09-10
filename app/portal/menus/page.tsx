import { PortalShell } from "@/components/portal-shell";
import { MenuEditor } from "@/components/content-editor";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const mealLabels: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", dinner: "Dîner" };
const mealOrder = ["breakfast", "lunch", "dinner"];

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy.toISOString().slice(0, 10);
}

export default async function MenusPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = addDays(today, 6);
  const { data } = await supabase.from("menu_items").select("id, service_date, meal, description").gte("service_date", startDate).lte("service_date", endDate).order("service_date");
  const menus = data || [];
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const canEdit = profile.role === "governance" || profile.role === "admin";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Menus de la semaine</h1><p>Les repas proposés pour les sept jours à venir.</p></div></div>
    <div className={canEdit ? "dashboard-grid" : "stack"}>
      <section className="card"><div className="card-header"><div><h2>Repas à venir</h2><p className="card-subtitle">Sous réserve des adaptations individuelles du séjour.</p></div></div><div className="card-body"><div className="weekly-menu-grid">{days.map((date) => {
        const dayMenus = menus.filter((menu) => menu.service_date === date);
        return <article className="weekly-menu-day" key={date}><h3>{formatDate(date)}</h3>{mealOrder.map((meal) => {
          const item = dayMenus.find((menu) => menu.meal === meal);
          return <div className="weekly-menu-meal" key={meal}><strong>{mealLabels[meal]}</strong><p>{item?.description || "Menu en cours de préparation."}</p></div>;
        })}</article>;
      })}</div></div></section>
      {canEdit && <aside className="card"><div className="card-header"><div><h2>Mettre à jour un menu</h2><p className="card-subtitle">La modification est publiée immédiatement.</p></div></div><div className="card-body"><MenuEditor /></div></aside>}
    </div>
  </PortalShell>;
}
