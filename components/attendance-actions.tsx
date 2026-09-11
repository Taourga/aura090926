"use client";

import { useState } from "react";
import { markActivityAttendance, markAppointmentAttendance } from "@/app/portal/actions";
import { ActionFeedback } from "@/components/action-feedback";

export function AttendanceActions({ kind, recordId }: { kind: "appointment" | "activity"; recordId: string }) {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [loading, setLoading] = useState(false);
  async function mark(status: "present" | "absent") {
    setLoading(true);
    setResult(kind === "appointment" ? await markAppointmentAttendance(recordId, status) : await markActivityAttendance(recordId, status));
    setLoading(false);
  }
  return <div className="attendance-actions"><ActionFeedback message={result.success} error={result.error} /><button className="button button-secondary button-small" disabled={loading} onClick={() => mark("present")}>{loading ? "..." : "Présent"}</button><button className="button button-danger button-small" disabled={loading} onClick={() => mark("absent")}>{loading ? "..." : "Absent"}</button></div>;
}
