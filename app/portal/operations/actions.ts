"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  ["/portal", "/portal/discharges", "/portal/handoff", "/portal/pulse", "/portal/roi"].forEach((path) => revalidatePath(path));
}

export async function setOperationalTaskDone(taskId: string, done: boolean) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_operational_task", { p_task_id: taskId, p_done: done });
  if (error) return { error: error.message };
  refresh();
  return { success: done ? "Tâche terminée." : "Tâche rouverte." };
}
