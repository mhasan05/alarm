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

/** Display name for any account id, in Bengali. */
export function nameOf(db: Database, id: string): string {
  if (id === "system") return "সিস্টেম";
  const admin = db.admins.find((a) => a.id === id);
  return admin?.nameBn ?? admin?.name ?? reviewerOf(db, id)?.nameBn ?? staffOf(db, id)?.nameBn ?? profileOf(db, id)?.name ?? id;
}

/** The person's ALARM ID. Every account's id is its ALARM ID (KAR- + 6 digits). */
export const alarmIdOf = (_db: Database, id: string) => id;

/** Bengali name (same as nameOf; kept for existing callers). */
export const nameBnOf = (db: Database, id: string) => nameOf(db, id);

export type AccountRole = "admin" | "reviewer" | "staff" | "politician";
export const roleOfId = (db: Database, id: string): AccountRole | "system" =>
  id === "system"
    ? "system"
    : (userOf(db, id)?.role ??
      (db.admins.some((a) => a.id === id) ? "admin" : db.reviewers.some((r) => r.id === id) ? "reviewer" : db.staff.some((x) => x.id === id) ? "staff" : "politician"));

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
    score,
    band: scoreBand(score, acc.length),
  };
}

export function scoreBand(score: number, accepted = 1) {
  if (!accepted) return { label: "এখনও কোনো তথ্য প্রকাশ হয়নি", color: "#4A7060" };
  return score >= 67
    ? { label: "বেশিরভাগ ইতিবাচক", color: "#1A7A4A" }
    : score >= 34
      ? { label: "ভালো-মন্দ মেশানো", color: "#D97706" }
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
/** Was the disputed submission edited after the dispute was filed? ("আংশিক গ্রহণ" needs a correction first.) */
export const editedSinceDispute = (db: Database, d: Dispute) => !!submissionOf(db, d.submissionCode)?.events.some((e) => e.type === "edited" && e.at >= d.filedAt);
export const openDisputes = (db: Database) => db.disputes.filter((d) => d.state === "Open");
export const disputesFor = (db: Database, profileId: string) =>
  db.disputes.filter((d) => d.profileId === profileId).sort((a, b) => b.filedAt.localeCompare(a.filedAt));

/**
 * Who may resolve (and edit the submission of) a dispute: the প্রধান নির্বাহী সম্পাদক always, and an
 * active নির্বাহী সম্পাদক whose coverage includes the রাজনৈতিক কর্মী's area.
 */
export function canResolveDispute(db: Database, userId: string, d: Dispute): boolean {
  if (db.admins.some((a) => a.id === userId)) return true;
  const r = reviewerOf(db, userId);
  const p = profileOf(db, d.profileId);
  return !!r && !!p && r.status === "Active" && r.areas.includes(coverageKey(p));
}

/** Disputes a নির্বাহী সম্পাদক can resolve, newest first. */
export const disputesForReviewer = (db: Database, reviewerId: string) =>
  db.disputes.filter((d) => canResolveDispute(db, reviewerId, d)).sort((a, b) => b.filedAt.localeCompare(a.filedAt));

/** Whether a politician may dispute a submission, and the label explaining why not. */
export function canDispute(db: Database, s: Submission): { allowed: boolean; label: string } {
  if (s.state === "Rejected") return { allowed: false, label: "প্রকাশ হয়নি" };
  if (disputeForSubmission(db, s.code)) return { allowed: false, label: "অভিযোগ জমা হয়েছে" };
  if (s.state === "Pending") return { allowed: false, label: "যাচাইয়ের পর অভিযোগ করা যাবে" };
  if (s.origin === "self") return { allowed: false, label: "নিজের দেওয়া তথ্য" };
  return { allowed: true, label: "এই তথ্যে ভুল থাকলে অভিযোগ করুন" };
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
  Accepted: { label: "গ্রহণ হয়েছে", fg: "#1A7A4A", bg: "rgba(26,122,74,0.10)" },
  Pending: { label: "যাচাই চলছে", fg: "#D97706", bg: "rgba(217,119,6,0.10)" },
  Rejected: { label: "বাতিল", fg: "#F42A41", bg: "rgba(244,42,65,0.10)" },
};

/** Status chip (label + Tailwind classes) for team portals. */
export const STATE_CHIP: Record<SubmissionState, { label: string; cls: string }> = {
  Accepted: { label: "গ্রহণ হয়েছে", cls: "bg-success/10 text-success" },
  Pending: { label: "যাচাই চলছে", cls: "bg-warning/10 text-warning" },
  Rejected: { label: "বাতিল", cls: "bg-danger/10 text-danger" },
};

export const ORIGIN_STYLE = {
  staff: { label: "তদন্ত সম্পাদকের তথ্য", fg: "#D97706", bg: "rgba(217,119,6,0.12)" },
  self: { label: "নিজের দেওয়া তথ্য", fg: "#7A3FA8", bg: "rgba(122,63,168,0.12)" },
} as const;

/** Evidence tier follows the submission state. */
export const tierOf = (s: SubmissionState) => (s === "Accepted" ? "যাচাই করা" : s === "Pending" ? "জমা পড়েছে" : "যাচাই হয়নি");
