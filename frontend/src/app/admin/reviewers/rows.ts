// Reviewer roster rows derived from the store: queues, decisions and timing come from real records.

import { daysSince, phoneIntl } from "@/lib/db/format";
import { decisionsBy, queueFor } from "@/lib/db/selectors";
import type { Database, ReviewerStatus } from "@/lib/db/types";

export type Reviewer = {
  id: string;
  name: string;
  nameBn: string;
  initials: string;
  phone: string;
  email: string;
  status: ReviewerStatus;
  areas: string[];
  /** Waiting in their queue now. */
  queue: number;
  /** Oldest item in the queue, in days. */
  oldest: number;
  decidedMonth: number;
  acceptRate: number;
  avgHours: number;
  joined: string;
  nid: string;
  note?: string;
};

const monthKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit" }).format(new Date(iso));

export function reviewerRows(db: Database): Reviewer[] {
  const month = monthKey(new Date().toISOString());
  return db.reviewers.map((r) => {
    const q = queueFor(db, r.id);
    const decided = decisionsBy(db, r.id).filter((s) => s.decidedAt && monthKey(s.decidedAt) === month);
    const accepted = decided.filter((s) => s.state === "Accepted").length;
    const total = decided.length + r.history.decided;
    const hours = decided.map((s) => (new Date(s.decidedAt!).getTime() - new Date(s.submittedAt).getTime()) / 3_600_000);
    const avgHours = total ? Math.round((hours.reduce((n, h) => n + h, 0) + r.history.avgHours * r.history.decided) / total) : 0;
    return {
      id: r.id,
      name: r.name,
      nameBn: r.nameBn,
      initials: r.initials,
      phone: phoneIntl(r.phone),
      email: r.email,
      status: r.status,
      areas: r.areas,
      queue: q.length,
      oldest: q[0] ? daysSince(q[0].submittedAt) : 0,
      decidedMonth: total,
      acceptRate: total ? Math.round(((accepted + r.history.accepted) / total) * 100) : 0,
      avgHours,
      joined: r.joined,
      nid: r.nid,
      note: r.note,
    };
  });
}
