import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["page_view", "nav_click", "action_click", "menu_open"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safePath(value: unknown) {
  return typeof value === "string" && value.startsWith("/portal") ? value.slice(0, 180) : null;
}

export async function POST(request: Request) {
  if (request.headers.get("x-aura-ux-test") !== "1") return new NextResponse(null, { status: 204 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 204 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.eventType !== "string" || !allowedTypes.has(body.eventType)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  if (typeof body.sessionId !== "string" || !uuidPattern.test(body.sessionId)) return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  const path = safePath(body.path);
  const target = body.target == null ? null : safePath(body.target);
  if (!path) return NextResponse.json({ error: "invalid_path" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("active_facility_id").eq("id", user.id).maybeSingle();
  if (!profile?.active_facility_id) return new NextResponse(null, { status: 204 });
  const { data: membership } = await supabase.from("facility_memberships").select("role").eq("user_id", user.id).eq("facility_id", profile.active_facility_id).eq("active", true).maybeSingle();
  if (!membership?.role) return new NextResponse(null, { status: 204 });

  const { error } = await supabase.from("ux_events").insert({
    facility_id: profile.active_facility_id,
    role: String(membership.role),
    event_type: body.eventType,
    path,
    target,
    session_id: body.sessionId,
  });

  if (error) return NextResponse.json({ error: "tracking_failed" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
