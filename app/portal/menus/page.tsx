import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { MenuEditor } from "@/components/content-editor";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const mealLabels: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", dinner: "Dîner" };
const mealOrder = ["breakfast", "lunch", "dinner"];

function localDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(key: string, amount: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export default async function MenusPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const startDate = localDateKey(new Date(), profile.facility.timezone);
  const endDate = addDays(startDate, 6);
  const { data } = await supabase.from("menu_items").select("id, service_date, meal, description").gte("service_date", startDate).lte("service_date", endDate).order("service_date");
  const menus = data || [];
  const days = Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
  const canEdit = profile.role === "governance" || profile.role === "admin";

  return <PortalShell profile={profile}>
    <div className="page-intro"><div><div className="section-kicker">Restauration</div><h1>Menus de la semaine</h1><p>Les repas proposés pour les sept jours à venir, selon la date locale de l’établissement.</p></div><div className="page-intro-actions"><Link href="/portal/information" className="button button-secondary">Infos pratiques</Link>{profile.role === "patient" && <Link href="/portal/appointments" className="button button-secondary">Mon planning</Link>}</div></div>
    <div className={canEdit ? "dashboard-grid" : "stack"}>
      <section className="card"><div className="card-header"><div><h2>Repas à venir</h2><p className="card-subtitle">Sous réserve des adaptations individuelles décidées par l’équipe soignante.</p></div></div><div className="card-body"><div className="weekly-menu-grid">{days.map((date, index) => {
        const dayMenus = menus.filter((menu) => menu.service_date === date);
        return <article className={`weekly-menu-day${index === 0 ? " weekly-menu-day--today" : ""}`} key={date}><div className="weekly-menu-day-head"><h3>{formatDate(date)}</h3>{index === 0 && <span className="badge badge-info">Aujourd’hui</span>}</div>{mealOrder.map((meal) => {
          const item = dayMenus.find((menu) => menu.meal === meal);
          return <div className="weekly-menu-meal" key={meal}><strong>{mealLabels[meal]}</strong><p>{item?.description || "Menu en cours de préparation."}</p></div>;
        })}</article>;
      })}</div></div></section>
      {canEdit && <aside className="card"><div className="card-header"><div><h2>Mettre à jour un menu</h2><p className="card-subtitle">La modification est publiée immédiatement pour les patients concernés.</p></div></div><div className="card-body"><MenuEditor /></div></aside>}
    </div>
  </PortalShell>;
}
