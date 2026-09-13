import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function StaffMessageBar() {
  const profile = await requireProfile();
  if (!["doctor", "nurse"].includes(profile.role)) return null;
  const supabase = await createClient();
  const { count } = await supabase.from("clinical_messages").select("id", { count: "exact", head: true }).eq("recipient_id", profile.id).is("read_at", null);
  const unread = count || 0;
  return <div className="staff-message-bar"><Link href="/portal/messages"><span className="staff-message-icon">✉</span><span><strong>Messagerie</strong><small>{unread ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}` : "Aucun nouveau message"}</small></span>{unread > 0 && <b>{unread}</b>}</Link></div>;
}
