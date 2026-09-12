import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const healthy = hasSupabaseUrl && hasPublishableKey;

  return NextResponse.json({
    status: healthy ? "ok" : "degraded",
    app: "AURA",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || "local",
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}
