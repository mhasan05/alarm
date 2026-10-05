"use client";

import { useMe } from "@/lib/auth-client";
import { daysSince } from "@/lib/db/format";
import { coveredProfiles, decisionsBy, queueFor, submissionsFor } from "@/lib/db/selectors";
import { useDb } from "@/lib/db/store";
import type { Submission } from "@/lib/db/types";

/** Queue items older than this many days are overdue (48 hours). */
export const OVERDUE_DAYS = 2;

const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(iso));
const weekday = (d: Date) => new Intl.DateTimeFormat("bn-BD", { weekday: "short", timeZone: "Asia/Dhaka" }).format(d);

const isAccept = (s: Submission) => s.state === "Accepted";

/** The signed-in reviewer's queue, decisions and coverage. */
export function useReviewer() {
  const db = useDb();
  const me = useMe();
  const reviewer = me?.reviewer;
  const queue = reviewer ? queueFor(db, reviewer.id).map((s) => ({ ...s, days: daysSince(s.submittedAt) })) : [];
  const decisions = reviewer ? decisionsBy(db, reviewer.id) : [];
  const profiles = reviewer ? coveredProfiles(db, reviewer) : [];
  // Every submission from this নির্বাহী সম্পাদক's area — waiting or decided — newest first ("সকল প্রতিবেদন").
  const areaIds = new Set(profiles.map((p) => p.id));
  const allReports = db.submissions.filter((s) => areaIds.has(s.profileId)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  // Last 7 days of decisions, today last.
  const now = new Date();
  const week: [string, number, number][] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86_400_000);
    const key = dayKey(d.toISOString());
    const onDay = decisions.filter((s) => s.decidedAt && dayKey(s.decidedAt) === key);
    return [i === 6 ? "আজ" : weekday(d), onDay.filter(isAccept).length, onDay.length - onDay.filter(isAccept).length];
  });

  const month = dayKey(now.toISOString()).slice(0, 7);
  const thisMonth = decisions.filter((s) => s.decidedAt && dayKey(s.decidedAt).startsWith(month));
  const monthAccepted = thisMonth.filter(isAccept).length + (reviewer?.history.accepted ?? 0);
  const monthTotal = thisMonth.length + (reviewer?.history.decided ?? 0);

  return {
    db,
    me,
    reviewer,
    queue,
    decisions,
    allReports,
    profiles: profiles.map((p) => {
      const subs = submissionsFor(db, p.id);
      return {
        ...p,
        pending: subs.filter((s) => s.state === "Pending").length,
        accepted: subs.filter((s) => s.state === "Accepted").length,
        rejected: subs.filter((s) => s.state === "Rejected").length,
      };
    }),
    stats: {
      pending: queue.length,
      overdue: queue.filter((q) => q.days >= OVERDUE_DAYS).length,
      self: queue.filter((q) => q.origin === "self").length,
      week,
      weekAccepted: week.reduce((n, d) => n + d[1], 0),
      weekRejected: week.reduce((n, d) => n + d[2], 0),
      monthAccepted,
      monthRejected: monthTotal - monthAccepted,
      monthTotal,
      acceptRate: monthTotal ? Math.round((monthAccepted / monthTotal) * 100) : 0,
    },
  };
}
