import { PortalShell } from "@/components/portal-shell";
import { ActivityButton } from "@/components/activity-button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: activities }, { data: enrollments }, { data: enrollmentCounts }] = await Promise.all([
    supabase.from("activities").select("id, title, description, starts_at, ends_at, location, capacity, active").eq("active", true).gte("starts_at", new Date().toISOString()).order("starts_at").limit(60),
    supabase.from("activity_enrollments").select("activity_id, patient_id"),
    supabase.rpc("activity_enrollment_counts"),
  ]);
  const enrollmentList = enrollments || [];
  const enrollmentCountRows = (enrollmentCounts || []) as { activity_id: string; enrolled_count: number | string }[];
  const countByActivity = new Map(enrollmentCountRows.map((item) => [item.activity_id, Number(item.enrolled_count)]));
  return <PortalShell profile={profile}>
    <div className="page-intro"><div><h1>Activités</h1><p>Découvrez les activités proposées pendant le séjour.</p></div></div>
    <section className="card"><div className="card-header"><div><h2>Prochaines activités</h2><p className="card-subtitle">Sport, art-thérapie, relaxation et autres ateliers.</p></div></div><div className="card-body"><div className="list">{activities?.length ? activities.map((activity) => { const used = countByActivity.get(activity.id) || 0; const enrolled = enrollmentList.some((item) => item.activity_id === activity.id && item.patient_id === profile.id); return <div className="list-row" key={activity.id} style={{ gridTemplateColumns: "100px minmax(0,1fr) auto" }}><div className="time">{formatDateTime(activity.starts_at)}</div><div><div className="row-title">{activity.title}</div><div className="row-meta">{activity.description || ""}{activity.location ? ` · ${activity.location}` : ""} · {used}/{activity.capacity} places</div></div>{profile.role === "patient" ? <ActivityButton activityId={activity.id} enrolled={enrolled} full={used >= activity.capacity} /> : <span className="badge badge-info">{used} inscrit{used > 1 ? "s" : ""}</span>}</div>; }) : <p className="empty">Aucune activité n&apos;est programmée pour le moment.</p>}</div></div></section>
  </PortalShell>;
}
