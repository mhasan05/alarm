// Pure read helpers over the database. Every portal's numbers come from here, so they always agree.

import type { Category, Database, Dispute, Profile, Reviewer, Submission, SubmissionState } from "./types";

// ── Lookups ─────────────────────────────────────────────────────────────────

export const profileOf = (db: Database, id: string) => db.profiles.find((p) => p.id === id);
export const staffOf = (db: Database, id: string) => db.staff.find((s) => s.id === id);
export const reviewerOf = (db: Database, id: string) => db.reviewers.find((r) => r.id === id);
export const submissionOf = (db: Database, code: string) => db.submissions.find((s) => s.code === code);
export const disputeOf = (db: Database, code: string) => db.disputes.find((d) => d.code === code);
export const reportOf = (db: Database, code: string) => db.reports.find((r) => r.code === code);
export const userOf = (db: Database, id: string) => db.users.find((u) => u.id === id);

/** Display name for any account id (English for team members, Bengali for politicians). */
export function nameOf(db: Database, id: string): string {
  if (id === "system") return "System";
  return (
    db.admins.find((a) => a.id === id)?.name ??
    reviewerOf(db, id)?.name ??
    staffOf(db, id)?.name ??
    profileOf(db, id)?.name ??
    id
  );
}

/** Bengali name for team members (used on Bengali screens). */
/** The person's ALARM ID (KAR-…), or "" for an account without a sign-in yet. */
export const alarmIdOf = (db: Database, id: string) => db.users.find((u) => u.id === id)?.alarmId ?? "";

export function nameBnOf(db: Database, id: string): string {
  return reviewerOf(db, id)?.nameBn ?? staffOf(db, id)?.nameBn ?? profileOf(db, id)?.name ?? nameOf(db, id);
}

export type AccountRole = "admin" | "reviewer" | "staff" | "politician";
export const roleOfId = (db: Database, id: string): AccountRole | "system" =>
  id === "system" ? "system" : (userOf(db, id)?.role ?? (id.startsWith("ADM") ? "admin" : id.startsWith("REV") ? "reviewer" : id.startsWith("FS") ? "staff" : "politician"));

// ── Coverage ────────────────────────────────────────────────────────────────

/** "district · thana" — how reviewers' and staff areas are matched to profiles. */
export const coverageKey = (p: Pick<Profile, "district" | "thana">) => `${p.district} · ${p.thana}`;

export const reviewersFor = (db: Database, profileId: string) => {
  const p = profileOf(db, profileId);
  return p ? db.reviewers.filter((r) => r.areas.includes(coverageKey(p))) : [];
};

export const activeReviewersFor = (db: Database, profileId: string) => reviewersFor(db, profileId).filter((r) => r.status === "Active");

export const coveredProfiles = (db: Database, r: Reviewer) => db.profiles.filter((p) => r.areas.includes(coverageKey(p)));

// ── Submissions ─────────────────────────────────────────────────────────────

export const submissionsFor = (db: Database, profileId: string) =>
  db.submissions.filter((s) => s.profileId === profileId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

/** Counts in the score: accepted and not withdrawn. */
export const isPublished = (s: Submission) => s.state === "Accepted";
export const isOpen = (s: Submission) => s.state === "Pending";

export type ProfileSummary = {
  accepted: number;
  positive: number;
  negative: number;
  pending: number;
  rejected: number;
  held: number;
  score: number;
  band: { label: string; color: string };
};

export function summarize(subs: Submission[]): ProfileSummary {
  const acc = subs.filter(isPublished);
  const positive = acc.filter((s) => s.category === "ইতিবাচক").length;
  const score = acc.length ? Math.round((positive / acc.length) * 100) : 0;
  return {
    accepted: acc.length,
    positive,
    negative: acc.length - positive,
    pending: subs.filter(isOpen).length,
    rejected: subs.filter((s) => s.state === "Rejected").length,
    held: subs.filter((s) => s.state === "Held").length,
    score,
    band: scoreBand(score, acc.length),
  };
}

export function scoreBand(score: number, accepted = 1) {
  if (!accepted) return { label: "এখনও কোনো তথ্য প্রকাশিত হয়নি", color: "#4A7060" };
  return score >= 67
    ? { label: "বেশিরভাগ ইতিবাচক", color: "#1A7A4A" }
    : score >= 34
      ? { label: "মিশ্র রেকর্ড", color: "#D97706" }
      : { label: "বেশিরভাগ নেতিবাচক", color: "#F42A41" };
}

export const scoreColor = (s: number) => (s >= 67 ? "#1A7A4A" : s >= 34 ? "#D97706" : "#F42A41");

export const profileSummary = (db: Database, profileId: string) => summarize(submissionsFor(db, profileId));

/** Pending submissions a reviewer can decide, oldest first. */
export function queueFor(db: Database, reviewerId: string) {
  const r = reviewerOf(db, reviewerId);
  if (!r) return [];
  const keys = new Set(r.areas);
  return db.submissions
    .filter((s) => s.state === "Pending")
    .filter((s) => {
      const p = profileOf(db, s.profileId);
      return p && keys.has(coverageKey(p));
    })
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

/** Everything a reviewer has decided, newest first. */
export const decisionsBy = (db: Database, reviewerId: string) =>
  db.submissions.filter((s) => s.decidedBy === reviewerId && s.decidedAt).sort((a, b) => b.decidedAt!.localeCompare(a.decidedAt!));

export const staffSubmissions = (db: Database, staffId: string) =>
  db.submissions.filter((s) => s.staffId === staffId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

export const staffAssignments = (db: Database, staffId: string) => db.assignments.filter((a) => a.staffId === staffId);
export const openAssignments = (db: Database, staffId: string) => staffAssignments(db, staffId).filter((a) => a.open);

/** Submissions in the queue with no active reviewer to decide them. */
export const strandedCount = (db: Database) =>
  db.submissions.filter((s) => s.state === "Pending" && activeReviewersFor(db, s.profileId).length === 0).length;

// ── Disputes ────────────────────────────────────────────────────────────────

export const disputeForSubmission = (db: Database, code: string) => db.disputes.find((d) => d.submissionCode === code);
export const isDisputeOpen = (d?: Dispute) => d?.state === "Open";
export const openDisputes = (db: Database) => db.disputes.filter((d) => d.state === "Open");
export const disputesFor = (db: Database, profileId: string) =>
  db.disputes.filter((d) => d.profileId === profileId).sort((a, b) => b.filedAt.localeCompare(a.filedAt));

/** Whether a politician may dispute a submission, and the label explaining why not. */
export function canDispute(db: Database, s: Submission): { allowed: boolean; label: string } {
  if (s.state === "Rejected" || s.state === "Held") return { allowed: false, label: "প্রকাশিত নয়" };
  if (s.state === "Withdrawn") return { allowed: false, label: "প্রত্যাহার করা হয়েছে" };
  if (disputeForSubmission(db, s.code)) return { allowed: false, label: "অভিযোগ জমা হয়েছে" };
  if (s.state === "Pending") return { allowed: false, label: "পর্যালোচনার পর অভিযোগ করা যাবে" };
  if (s.origin === "self") return { allowed: false, label: "নিজের দেওয়া তথ্য" };
  return { allowed: true, label: "এই তথ্যে অসঙ্গতির অভিযোগ করুন" };
}

// ── Analysis & reports ──────────────────────────────────────────────────────

export const reportsForProfile = (db: Database, profileId: string) => db.reports.filter((r) => r.profileId === profileId);
export const latestReport = (db: Database, profileId: string) => reportsForProfile(db, profileId)[0];

/**
 * The analysis can run once the profile has accepted data and nothing waiting in review.
 * `newData` is true when accepted submissions exist that the latest report version wasn't cut from.
 */
export function analysisStatus(db: Database, profileId: string) {
  const subs = submissionsFor(db, profileId);
  const pending = subs.filter(isOpen).length;
  const accepted = subs.filter(isPublished);
  const report = latestReport(db, profileId);
  const basis = new Set(report?.basis ?? []);
  const newData = !report || accepted.some((s) => !basis.has(s.code));
  return { pending, accepted: accepted.length, ready: pending === 0 && accepted.length > 0 && newData, report, newData };
}

// ── Codes ───────────────────────────────────────────────────────────────────

/** Next free code for a prefix, e.g. nextCode(["SUB-0431"], "SUB", 4) → "SUB-0432". */
export function nextCode(codes: string[], prefix: string, width: number) {
  const max = codes.filter((c) => c.startsWith(`${prefix}-`)).reduce((m, c) => Math.max(m, Number(c.split("-").pop()) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

// ── Presentation constants ──────────────────────────────────────────────────

export const CATEGORY_STYLE: Record<Category, { fg: string; bg: string }> = {
  ইতিবাচক: { fg: "#1A7A4A", bg: "rgba(26,122,74,0.12)" },
  নেতিবাচক: { fg: "#F42A41", bg: "rgba(244,42,65,0.12)" },
};

export const STATE_BN: Record<SubmissionState, { label: string; fg: string; bg: string }> = {
  Accepted: { label: "গৃহীত", fg: "#1A7A4A", bg: "rgba(26,122,74,0.10)" },
  Pending: { label: "পর্যালোচনাধীন", fg: "#D97706", bg: "rgba(217,119,6,0.10)" },
  Rejected: { label: "বাতিল", fg: "#F42A41", bg: "rgba(244,42,65,0.10)" },
  Held: { label: "স্থগিত", fg: "#F42A41", bg: "rgba(244,42,65,0.10)" },
  Withdrawn: { label: "প্রত্যাহৃত", fg: "#4A7060", bg: "rgba(74,112,96,0.10)" },
};

export const STATE_EN: Record<SubmissionState, { label: string; cls: string }> = {
  Accepted: { label: "Accepted", cls: "bg-success/10 text-success" },
  Pending: { label: "In review", cls: "bg-warning/10 text-warning" },
  Rejected: { label: "Rejected", cls: "bg-danger/10 text-danger" },
  Held: { label: "Held", cls: "bg-danger/10 text-danger" },
  Withdrawn: { label: "Withdrawn", cls: "bg-surface text-muted" },
};

export const ORIGIN_STYLE = {
  staff: { label: "মাঠকর্মীর তথ্য", fg: "#D97706", bg: "rgba(217,119,6,0.12)" },
  self: { label: "নিজের দেওয়া তথ্য", fg: "#7A3FA8", bg: "rgba(122,63,168,0.12)" },
} as const;

/** Evidence tier follows the submission state. */
export const tierOf = (s: SubmissionState) => (s === "Accepted" ? "যাচাইকৃত" : s === "Pending" ? "রিপোর্টেড" : "অযাচাইকৃত");
