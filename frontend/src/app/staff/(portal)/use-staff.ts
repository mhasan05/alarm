"use client";

import { useMe } from "@/lib/auth-client";
import { bn, daysUntil } from "@/lib/db/format";
import { profileOf, staffAssignments, staffSubmissions } from "@/lib/db/selectors";
import { useDb } from "@/lib/db/store";
import type { Assignment, SubmissionState } from "@/lib/db/types";

/** Staff-facing state labels. Staff see the decision and reason, never the reviewer. */
export const STAFF_STATE: Record<SubmissionState, { label: string; fg: string; bg: string }> = {
  Pending: { label: "পর্যালোচনাধীন", fg: "#D97706", bg: "rgba(217,119,6,0.10)" },
  Accepted: { label: "গৃহীত", fg: "#1A7A4A", bg: "rgba(26,122,74,0.10)" },
  Rejected: { label: "বাতিল", fg: "#F42A41", bg: "rgba(244,42,65,0.10)" },
  Held: { label: "স্থগিত", fg: "#F42A41", bg: "rgba(244,42,65,0.10)" },
  Withdrawn: { label: "প্রত্যাহৃত", fg: "#4A7060", bg: "rgba(74,112,96,0.10)" },
};

export type Urgency = "soon" | "ok" | "done" | "late";
export const URGENCY_STYLE: Record<Urgency, { fg: string; bg: string; accent: string }> = {
  late: { fg: "#F42A41", bg: "rgba(244,42,65,0.10)", accent: "#F42A41" },
  soon: { fg: "#F42A41", bg: "rgba(244,42,65,0.10)", accent: "#F42A41" },
  ok: { fg: "#D97706", bg: "rgba(217,119,6,0.10)", accent: "#D97706" },
  done: { fg: "#1A7A4A", bg: "rgba(26,122,74,0.10)", accent: "#C8DDD6" },
};

export function dueOf(a: Assignment): { label: string; urgency: Urgency; days: number } {
  if (!a.open) return { label: "সংগ্রহ সম্পন্ন", urgency: "done", days: 0 };
  const d = daysUntil(a.due);
  if (d < 0) return { label: `সময় পেরিয়েছে ${bn(-d)} দিন`, urgency: "late", days: d };
  if (d === 0) return { label: "আজ শেষ দিন", urgency: "soon", days: d };
  return { label: `${bn(d)} দিন বাকি`, urgency: d <= 2 ? "soon" : "ok", days: d };
}

/** The signed-in field staff member's work. */
export function useStaff() {
  const db = useDb();
  const me = useMe();
  const staff = me?.staff;
  const subs = staff ? staffSubmissions(db, staff.id) : [];
  const assignments = staff
    ? staffAssignments(db, staff.id).sort((a, b) => Number(b.open) - Number(a.open) || a.due.localeCompare(b.due))
    : [];
  const tasks = assignments.map((a) => ({ ...a, profile: profileOf(db, a.profileId), due: dueOf(a), dueDate: a.due }));
  return {
    db,
    me,
    staff,
    subs,
    tasks,
    openTasks: tasks.filter((t) => t.open),
    counts: {
      pending: subs.filter((s) => s.state === "Pending").length,
      accepted: subs.filter((s) => s.state === "Accepted").length,
      rejected: subs.filter((s) => s.state === "Rejected" || s.state === "Held").length,
    },
  };
}
