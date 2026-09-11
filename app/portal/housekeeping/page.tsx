import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal-shell";
import { HousekeepingDashboard } from "@/components/housekeeping-dashboard";
import { parisDate, validServiceDate, type HousekeepingData } from "@/lib/housekeeping";

export const dynamic = "force-dynamic";

export default async function HousekeepingPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const profile = await requireProfile();
  if (!["governance", "technical", "admin"].includes(profile.role)) redirect("/portal");
  const params = await searchParams;
  const date = validServiceDate(params.date) ? params.date! : parisDate();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("housekeeping_dashboard", { p_date: date });
  return <PortalShell profile={profile}>{error || !data ? <section className="card"><div className="card-body"><h1>Hôtellerie & ménage</h1><p role="alert">Les données hôtelières n’ont pas pu être chargées. Réessayez ou contactez l’administrateur pour vérifier l’activation du module.</p></div></section> : <HousekeepingDashboard key={date} data={data as HousekeepingData} date={date} technical={profile.role === "technical"} />}</PortalShell>;
}
