"use client";

// Every change to the data goes through these functions. Each one records an audit entry, so the
// audit log reflects real activity. They mirror the endpoints the backend will expose.

import { toSafeHtml } from "../rich-text";
import { bn, bnDate, nowIso } from "./format";
import {
  activeReviewersFor,
  canResolveDispute,
  coverageKey,
  nameBnOf,
  nextCode,
  profileOf,
  reviewersFor,
  staffOf,
  submissionOf,
  submissionsFor,
} from "./selectors";
import { allAccountIds, getDb, getRoot, update, updateRoot } from "./store";
import type {
  AiFinding,
  Assignment,
  Category,
  Database,
  DisputeState,
  Evidence,
  FinalReport,
  Profile,
  Reviewer,
  ReviewerStatus,
  Settings,
  Staff,
  StaffStatus,
  Submission,
} from "./types";

const log = (db: Database, actor: string, action: string, target: string) => db.audit.unshift({ at: nowIso(), actor, action, target });

/** Audit action recorded when a রাজনৈতিক কর্মী account is created (read back on their settings page). */
export const CREATED_ACTIVIST = "রাজনৈতিক কর্মীর অ্যাকাউন্ট তৈরি করেছেন";

/** A new ALARM ID: KAR- + 6 random digits, unique across every account. It is the account's primary key. */
export function newAlarmId(db?: Database) {
  // Unique across every organisation, not just this one.
  const taken = new Set([...allAccountIds(), ...(db ? [...db.users.map((u) => u.id), ...db.profiles.map((p) => p.id), ...db.staff.map((x) => x.id), ...db.reviewers.map((r) => r.id)] : [])]);
  const rnd = new Uint32Array(1);
  let id = "";
  do {
    crypto.getRandomValues(rnd);
    id = `KAR-${String(100000 + (rnd[0] % 900000))}`;
  } while (taken.has(id));
  return id;
}

const evidenceId = (db: Database) =>
  nextCode(
    db.submissions.flatMap((s) => s.evidence.map((e) => e.id)),
    "EV",
    4,
  );

// ── Submissions ─────────────────────────────────────────────────────────────

export type NewSubmission = {
  profileId: string;
  origin: "staff" | "self";
  staffId?: string;
  category: Category;
  title: string;
  source: string;
  body: string;
  facts?: [string, string][];
  evidence: Omit<Evidence, "id">[];
};

/** Field staff or a politician adds information; it enters the reviewer queue. Returns the new code. */
export function submit(input: NewSubmission, actorId: string): string {
  let code = "";
  update((db) => {
    code = nextCode(db.submissions.map((s) => s.code), "SUB", 4);
    let id = Number(evidenceId(db).slice(3));
    const at = nowIso();
    db.submissions.push({
      code,
      profileId: input.profileId,
      origin: input.origin,
      staffId: input.staffId,
      category: input.category,
      title: input.title.trim(),
      source: input.source.trim(),
      body: toSafeHtml(input.body),
      facts: input.facts ?? [],
      evidence: input.evidence.map((e) => ({ ...e, id: `EV-${String(id++).padStart(4, "0")}` })),
      state: "Pending",
      submittedAt: at,
      events: [{ at, by: actorId, type: "submitted" }],
    });
    log(db, actorId, input.origin === "self" ? "নিজের কাজ যোগ করেছেন" : "তথ্য জমা দিয়েছেন", code);
  });
  return code;
}

export type SubmissionEdits = Partial<Pick<Submission, "title" | "body" | "source" | "category">> & { evidence?: Evidence[] };

/** Descriptions are rich text: keep only the safe subset of HTML before saving. */
const cleanEdits = (edits: SubmissionEdits): SubmissionEdits => (edits.body === undefined ? edits : { ...edits, body: toSafeHtml(edits.body) });

/**
 * Correct a submission's details or evidence. A নির্বাহী সম্পাদক does this before deciding; the
 * প্রধান নির্বাহী সম্পাদক can edit any submission from a তদন্ত সম্পাদক or রাজনৈতিক কর্মী at any stage.
 * The decision itself is unchanged; the edit is recorded in the history and the audit log.
 */
export function editSubmission(code: string, actorId: string, edits: SubmissionEdits, note?: string) {
  update((db) => {
    const s = submissionOf(db, code);
    if (!s) return;
    Object.assign(s, cleanEdits(edits));
    s.events.push({ at: nowIso(), by: actorId, type: "edited", note: note?.trim() || undefined });
    log(db, actorId, "জমা এডিট করেছেন", code);
  });
}

/** A submission is either accepted or rejected — there is no other decision. */
export type Decision = "Accepted" | "Rejected";

/** Accept or reject a submission, with a reason. */
export function decide(code: string, actorId: string, decision: Decision, reason: string, edits?: SubmissionEdits) {
  update((db) => {
    const s = submissionOf(db, code);
    if (!s) return;
    const at = nowIso();
    if (edits) {
      Object.assign(s, cleanEdits(edits));
      s.events.push({ at, by: actorId, type: "edited" });
    }
    s.state = decision;
    s.decidedAt = at;
    s.decidedBy = actorId;
    s.reason = reason;
    s.events.push({ at, by: actorId, type: decision === "Accepted" ? "accepted" : "rejected", note: reason });
    log(db, actorId, decision === "Accepted" ? "জমা গ্রহণ করেছেন" : "জমা বাতিল করেছেন", code);
  });
}

/** Undo a decision made in this session: back to the queue. */
export function undoDecision(code: string, actorId: string) {
  update((db) => {
    const s = submissionOf(db, code);
    if (!s) return;
    const last = s.events.at(-1);
    if (last && ["accepted", "rejected", "held", "revisit"].includes(last.type)) s.events.pop();
    s.state = "Pending";
    s.decidedAt = undefined;
    s.decidedBy = undefined;
    s.reason = undefined;
    log(db, actorId, "সিদ্ধান্ত ফিরিয়ে নিয়েছেন", code);
  });
}

// ── Disputes ────────────────────────────────────────────────────────────────

export function fileDispute(input: { submissionCode: string; reason: string; claim: string; attachments: string[]; files?: Evidence[] }, actorId: string): string {
  let code = "";
  update((db) => {
    const s = submissionOf(db, input.submissionCode);
    if (!s) return;
    code = nextCode(db.disputes.map((d) => d.code), "DSP", 3);
    db.disputes.push({ code, submissionCode: s.code, profileId: s.profileId, reason: input.reason, claim: toSafeHtml(input.claim), attachments: input.attachments, files: input.files, filedAt: nowIso(), state: "Open" });
    log(db, actorId, "অভিযোগ জমা দিয়েছেন", code);
  });
  return code;
}

export type DisputeOutcome = Exclude<DisputeState, "Open">;

/**
 * Three outcomes: reject the dispute (submission unchanged), accept it (submission rejected), or accept it
 * in part (the submission was corrected while resolving and stays published).
 */
export function decideDispute(code: string, actorId: string, outcome: DisputeOutcome, reason: string) {
  update((db) => {
    const d = db.disputes.find((x) => x.code === code);
    if (!d || !canResolveDispute(db, actorId, d)) return;
    const s = submissionOf(db, d.submissionCode);
    d.state = outcome;
    d.decidedAt = nowIso();
    d.decidedBy = actorId;
    d.decisionReason = reason.trim();
    // Dispute accepted → the submission is rejected (and leaves the profile and score).
    if (s && outcome === "Removed") {
      s.state = "Rejected";
      s.decidedAt = d.decidedAt;
      s.decidedBy = actorId;
      s.reason = `অভিযোগ ${d.code} গ্রহণ করা হয়েছে: ${reason.trim()}`;
      s.events.push({ at: d.decidedAt, by: actorId, type: "rejected", note: s.reason });
    }
    const what = { Kept: "অভিযোগ বাতিল করেছেন — তথ্য ঠিক আছে", Removed: "অভিযোগ গ্রহণ করেছেন — জমা বাতিল", Partial: "অভিযোগ আংশিক গ্রহণ করেছেন — জমা সংশোধন করা হয়েছে" } as const;
    log(db, actorId, what[outcome], code);
  });
}

export function undoDisputeDecision(code: string, actorId: string) {
  update((db) => {
    const d = db.disputes.find((x) => x.code === code);
    if (!d || !canResolveDispute(db, actorId, d)) return;
    const s = submissionOf(db, d.submissionCode);
    if (s && d.state === "Removed") {
      // Back to the accepted state the dispute was filed against.
      if (s.events.at(-1)?.type === "rejected") s.events.pop();
      const accepted = [...s.events].reverse().find((e) => e.type === "accepted");
      s.state = "Accepted";
      s.decidedAt = accepted?.at;
      s.decidedBy = accepted?.by;
      s.reason = accepted?.note;
    }
    d.state = "Open";
    d.decidedAt = d.decidedBy = d.decisionReason = undefined;
    log(db, actorId, "অভিযোগ আবার খুলেছেন", code);
  });
}

// ── Political activist accounts ────────────────────────────────────────────

export type ProfileInput = Omit<Profile, "id" | "initial" | "nid" | "registeredAt" | "account" | "audit"> & {
  /** Full NID; only a masked form is stored on the profile. */
  nid: string;
  password: string;
};

/** "1979123456612" → "১৯৭৯••••৬৬১২" — the profile keeps only the first and last four digits. */
const maskNid = (nid: string) => {
  const d = nid.replace(/\D/g, "");
  return d ? `${bn(d.slice(0, 4))}••••${bn(d.slice(-4))}` : "";
};

/** Admin creates a political activist's profile and login. Returns the new profile id. */
export function createProfile(input: ProfileInput, actorId: string): string {
  let id = "";
  update((db) => {
    id = newAlarmId(db);
    const at = nowIso();
    const { password, nid, ...rest } = input;
    db.profiles.push({
      ...rest,
      id,
      name: input.name.trim(),
      initial: input.name.trim().replace(/^মোঃ\s*/, "").slice(0, 1),
      nid: maskNid(nid),
      registeredAt: at,
      account: "Active",
      audit: { code: nextCode(db.profiles.map((p) => p.audit.code), "AUD-2026", 4), opened: at },
    });
    db.users.push({ id, role: "politician", phone: input.phone, password, subjectId: id });
    log(db, actorId, CREATED_ACTIVIST, id);
  });
  return id;
}

export function setProfileAccount(id: string, actorId: string, account: Profile["account"]) {
  update((db) => {
    const p = profileOf(db, id);
    if (!p) return;
    p.account = account;
    log(db, actorId, account === "Active" ? "রাজনৈতিক কর্মীর অ্যাকাউন্ট আবার চালু করেছেন" : account === "Suspended" ? "রাজনৈতিক কর্মীর অ্যাকাউন্ট বন্ধ করেছেন" : "রাজনৈতিক কর্মীর অ্যাকাউন্ট পুরোপুরি বন্ধ করেছেন", id);
  });
}

export function setStaffStatus(id: string, actorId: string, status: StaffStatus) {
  update((db) => {
    const s = staffOf(db, id);
    if (!s) return;
    s.status = status;
    log(db, actorId, status === "Suspended" ? "অ্যাকাউন্ট বন্ধ করেছেন" : status === "Deactivated" ? "অ্যাকাউন্ট পুরোপুরি বন্ধ করেছেন" : "অ্যাকাউন্ট আবার চালু করেছেন", id);
  });
}

export function setReviewerStatus(id: string, actorId: string, status: ReviewerStatus) {
  update((db) => {
    const r = db.reviewers.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    log(db, actorId, status === "Suspended" ? "অ্যাকাউন্ট বন্ধ করেছেন" : status === "Deactivated" ? "অ্যাকাউন্ট পুরোপুরি বন্ধ করেছেন" : "অ্যাকাউন্ট আবার চালু করেছেন", id);
  });
}

export function resetPassword(id: string, actorId: string) {
  update((db) => log(db, actorId, "অস্থায়ী পাসওয়ার্ড পাঠিয়েছেন", id));
}

/** Change the signed-in user's password. Returns an error message, or "" on success. */
export function changePassword(userId: string, current: string, next: string): string {
  const root = getRoot();
  if (root.superAdmin.id === userId) {
    if (root.superAdmin.password !== current) return "এখনকার পাসওয়ার্ড সঠিক নয়।";
    updateRoot((r) => {
      r.superAdmin.password = next;
      r.audit.unshift({ at: nowIso(), actor: userId, action: "পাসওয়ার্ড বদলেছেন", target: userId });
    });
    return "";
  }
  const user = getDb().users.find((u) => u.id === userId);
  if (!user) return "অ্যাকাউন্ট পাওয়া যায়নি।";
  if (user.password !== current) return "এখনকার পাসওয়ার্ড সঠিক নয়।";
  update((db) => {
    const u = db.users.find((x) => x.id === userId);
    if (u) u.password = next;
    log(db, userId, "পাসওয়ার্ড বদলেছেন", userId);
  });
  return "";
}

/** Set a new password after the phone was verified by OTP. Returns an error message, or "" on success. */
export function resetPasswordWithOtp(phone: string, next: string): string {
  // Signed out, so look the phone up in every organisation (and the সুপার অ্যাডমিন).
  const root = getRoot();
  const at = nowIso();
  if (root.superAdmin.phone === phone) {
    updateRoot((r) => {
      r.superAdmin.password = next;
      r.audit.unshift({ at, actor: r.superAdmin.id, action: "ওটিপি দিয়ে পাসওয়ার্ড রিসেট করেছেন", target: r.superAdmin.id });
    });
    return "";
  }
  const org = root.orgs.find((o) => o.db.users.some((u) => u.phone === phone));
  if (!org) return "এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট নেই।";
  updateRoot((r) => {
    const db = r.orgs.find((o) => o.id === org.id)!.db;
    const u = db.users.find((x) => x.phone === phone)!;
    u.password = next;
    db.audit.unshift({ at, actor: u.id, action: "ওটিপি দিয়ে পাসওয়ার্ড রিসেট করেছেন", target: u.id });
  });
  return "";
}

// ── Team accounts ───────────────────────────────────────────────────────────

export type AccountInput = {
  name: string;
  nameBn?: string;
  phone: string;
  email: string;
  nid: string;
  division: string;
  district: string;
  upazila: string;
  thana: string;
  seat: string;
  wards: string;
  joined: string;
  password: string;
};

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function createStaff(input: AccountInput, actorId: string, draft = false): string {
  let id = "";
  update((db) => {
    id = newAlarmId(db);
    const staff: Staff = {
      id,
      name: input.name.trim(),
      nameBn: input.nameBn?.trim() || input.name.trim(),
      initials: initialsOf(input.name),
      phone: input.phone,
      email: input.email,
      nid: input.nid,
      division: input.division,
      district: input.district,
      upazila: input.upazila,
      thana: input.thana,
      seat: input.seat,
      wards: input.wards,
      status: draft ? "Deactivated" : "On duty",
      joined: input.joined || nowIso(),
      completed: 0,
      device: { app: "—", lastSync: "এখনও সাইন ইন করেননি", pending: 0 },
      note: draft ? "খসড়া — অ্যাকাউন্ট চালু নয় এবং কোনো আমন্ত্রণ পাঠানো হয়নি।" : "আমন্ত্রণ পাঠানো হয়েছে — অ্যাপে সাইন ইন করলে অ্যাকাউন্ট চালু হবে।",
    };
    db.staff.push(staff);
    if (!draft) db.users.push({ id, role: "staff", phone: input.phone, password: input.password, subjectId: id });
    log(db, actorId, draft ? "তদন্ত সম্পাদকের খসড়া সেভ করেছেন" : "তদন্ত সম্পাদকের অ্যাকাউন্ট তৈরি করেছেন", id);
  });
  return id;
}

export function updateStaff(id: string, input: Partial<AccountInput>, actorId: string) {
  update((db) => {
    const s = staffOf(db, id);
    if (!s) return;
    const { password: _password, ...rest } = input;
    void _password;
    Object.assign(s, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined && v !== "")));
    if (input.name) s.initials = initialsOf(input.name);
    const u = db.users.find((x) => x.id === id);
    if (u && input.phone) u.phone = input.phone;
    log(db, actorId, "তদন্ত সম্পাদকের তথ্য আপডেট করেছেন", id);
  });
}

export function createReviewer(input: AccountInput, actorId: string, draft = false): string {
  let id = "";
  update((db) => {
    id = newAlarmId(db);
    const reviewer: Reviewer = {
      id,
      name: input.name.trim(),
      nameBn: input.nameBn?.trim() || input.name.trim(),
      initials: initialsOf(input.name),
      phone: input.phone,
      email: input.email,
      nid: input.nid,
      status: draft ? "Deactivated" : "Active",
      areas: input.district && input.thana ? [`${input.district} · ${input.thana}`] : [],
      joined: input.joined || nowIso(),
      history: { decided: 0, accepted: 0, avgHours: 0 },
      note: draft ? "খসড়া — অ্যাকাউন্ট চালু নয় এবং কোনো আমন্ত্রণ পাঠানো হয়নি।" : undefined,
    };
    db.reviewers.push(reviewer);
    if (!draft) db.users.push({ id, role: "reviewer", phone: input.phone, password: input.password, subjectId: id });
    log(db, actorId, draft ? "নির্বাহী সম্পাদকের খসড়া সেভ করেছেন" : "নির্বাহী সম্পাদকের অ্যাকাউন্ট তৈরি করেছেন", id);
  });
  return id;
}

export function updateReviewer(id: string, input: Partial<AccountInput>, actorId: string) {
  update((db) => {
    const r = db.reviewers.find((x) => x.id === id);
    if (!r) return;
    if (input.name) {
      r.name = input.name.trim();
      r.initials = initialsOf(input.name);
    }
    if (input.phone) r.phone = input.phone;
    if (input.email) r.email = input.email;
    const key = input.district && input.thana ? `${input.district} · ${input.thana}` : "";
    if (key && !r.areas.includes(key)) r.areas.unshift(key);
    const u = db.users.find((x) => x.id === id);
    if (u && input.phone) u.phone = input.phone;
    log(db, actorId, "নির্বাহী সম্পাদকের তথ্য আপডেট করেছেন", id);
  });
}

export function setCoverage(reviewerId: string, areas: string[], actorId: string) {
  update((db) => {
    const r = db.reviewers.find((x) => x.id === reviewerId);
    if (!r) return;
    r.areas = areas;
    log(db, actorId, "নির্বাহী সম্পাদকের দায়িত্বের এলাকা ঠিক করে দিয়েছেন", reviewerId);
  });
}

export function assign(input: Omit<Assignment, "id" | "open">, actorId: string) {
  update((db) => {
    const id = nextCode(db.assignments.map((a) => a.id), "ASG", 2);
    db.assignments.push({ ...input, id, open: true });
    log(db, actorId, "তদন্ত সম্পাদককে মাঠের কাজ দিয়েছেন", `${input.staffId} → ${input.profileId}`);
  });
}

// ── Settings ────────────────────────────────────────────────────────────────

export function saveSettings(patch: Partial<Settings>, actorId: string, what: string) {
  update((db) => {
    db.settings = { ...db.settings, ...patch };
    log(db, actorId, `সেটিংস আপডেট — ${what}`, "সেটিংস");
  });
}

export function saveParties(parties: Database["parties"], actorId: string) {
  update((db) => {
    db.parties = parties;
    log(db, actorId, "দল ও সংগঠনের তালিকা আপডেট করেছেন", "সেটিংস");
  });
}

// ── Analysis & reports ──────────────────────────────────────────────────────

const REPORT_SIGNATURE = () => {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, "0");
  return `${hex()}·${hex()}`;
};

/**
 * Cut a report from the kept findings. A profile that already has a report gets a new version;
 * otherwise a new report code is issued. The report is final immediately.
 */
export function generateReport(profileId: string, actorId: string, keptSubmissions: string[], keptAi: string[], note: string): { code: string; version: number } {
  let result = { code: "", version: 0 };
  update((db) => {
    const p = profileOf(db, profileId);
    if (!p) return;
    const subs = submissionsFor(db, profileId).filter((s) => keptSubmissions.includes(s.code)).reverse();
    const ai = db.aiFindings.filter((f) => keptAi.includes(f.id));

    const sources: FinalReport["sources"] = [];
    const cite = (title: string, meta: string) => {
      sources.push({ title, meta });
      return sources.length;
    };
    const finding = (item: { title: string; refs: number[]; remark?: string; kind?: string }) => ({ text: item.title, refs: item.refs, since: 1, kind: item.kind, remark: item.remark });

    const fromSub = (s: Submission) => {
      const staffName = s.staffId ? nameBnOf(db, s.staffId) : "রাজনৈতিক কর্মীর নিজের জমা";
      const ref = cite(s.source, `${staffName}${s.staffId ? ` (${s.staffId})` : ""} · ${new Intl.DateTimeFormat("bn-BD", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(s.submittedAt))}`);
      const dispute = db.disputes.find((d) => d.submissionCode === s.code);
      const remark =
        dispute?.state === "Open"
          ? `ব্যক্তি অভিযোগ (${dispute.code}) জমা দিয়েছেন; সিদ্ধান্তের অপেক্ষায়। ততক্ষণ সিদ্ধান্তটি আগের মতোই থাকবে।`
          : s.category === "নেতিবাচক"
              ? s.reason
              : undefined;
      return finding({ title: s.title, refs: [ref], remark, kind: s.category === "নেতিবাচক" ? "মাঠের প্রমাণ" : undefined });
    };
    const fromAi = (f: AiFinding) => {
      const refs = Array.from({ length: f.sources }, (_, i) => cite(i === 0 ? f.meta.split(" · ")[0] : `${f.meta.split(" · ")[0]} (যুক্ত সূত্র)`, "পাবলিক রেকর্ড · এআই খুঁজে পেয়েছে"));
      return finding({ title: f.title, refs, kind: f.category === "নেতিবাচক" ? "পাবলিক রেকর্ড" : undefined });
    };

    const positive = [...subs.filter((s) => s.category === "ইতিবাচক").map(fromSub), ...ai.filter((f) => f.category === "ইতিবাচক").map(fromAi)];
    const negative = [...subs.filter((s) => s.category === "নেতিবাচক").map(fromSub), ...ai.filter((f) => f.category === "নেতিবাচক").map(fromAi)];
    const at = nowIso();
    const existing = db.reports.find((r) => r.profileId === profileId);
    const reviewer = activeReviewersFor(db, profileId)[0] ?? reviewersFor(db, profileId)[0] ?? db.reviewers.find((r) => r.status === "Active");
    const dateLabel = bnDate(at);
    const version = (existing?.versions[0]?.v ?? 0) + 1;
    const confidence = Math.min(92, 58 + sources.length * 3);

    const report: FinalReport = {
      code: existing?.code ?? nextCode(db.reports.map((r) => r.code), "RPT-2026", 4),
      profileId,
      // Final as soon as it is created — there is no separate sign-off step.
      state: "approved",
      approval: { at, signature: REPORT_SIGNATURE() },
      published: at,
      versions: [
        {
          v: version,
          title: version === 1 ? "প্রথম ভার্সন" : "আবার বিশ্লেষণ ও নতুন ভার্সন",
          why: version === 1 ? "এআই বিশ্লেষণ যাচাই করে তৈরি প্রথম প্রতিবেদন" : "নতুন গ্রহণ করা তথ্য যোগ করার পর আবার বিশ্লেষণ",
          date: dateLabel,
          positive: positive.length,
          negative: negative.length,
        },
        ...(existing?.versions ?? []),
      ],
      subject: { name: p.name, father: existing?.subject.father ?? "—", nid: p.nid, job: "রাজনৈতিক কর্মী", address: p.office || `${p.thana}, ${p.district}` },
      purpose: existing?.purpose ?? "রাজনৈতিক কর্মীর কাজের অডিট",
      requester: existing?.requester ?? "প্রধান নির্বাহী সম্পাদক শুরু করেছেন",
      reviewerId: reviewer?.id ?? "",
      confidence: { pct: confidence, label: confidence >= 80 ? "বেশি" : confidence >= 65 ? "মাঝারি–বেশি" : "মাঝারি" },
      summary: `ব্যক্তির ${p.post} হিসেবে কাজের সময়টি যাচাই করা হয়েছে — তদন্ত সম্পাদকদের সংগ্রহ করা ও নির্বাহী সম্পাদকের গ্রহণ করা তথ্য এবং পাবলিক রেকর্ডের সঙ্গে মিলিয়ে। {pos}টি ইতিবাচক এবং {neg}টি নেতিবাচক সিদ্ধান্ত এই ভার্সনে রাখা হয়েছে। যে দাবিগুলো নিশ্চিত করা যায়নি সেগুলো প্রধান নির্বাহী সম্পাদক প্রতিবেদনে রাখেননি; সেগুলো অডিট রেকর্ডে কারণসহ রাখা আছে।`,
      summaryNote: "এই সারাংশ এআই বিশ্লেষণ থেকে তৈরি এবং প্রধান নির্বাহী সম্পাদক যাচাই করে চূড়ান্ত করেছেন।",
      positive,
      negative,
      negativeIntro: "যেসব সিদ্ধান্ত নির্বাহী সম্পাদক গ্রহণ করেছেন এবং প্রধান নির্বাহী সম্পাদক প্রতিবেদনে রেখেছেন।",
      sources,
      remark: "",
      adminNote: note.trim() || undefined,
      basis: submissionsFor(db, profileId).filter((s) => s.state === "Accepted").map((s) => s.code),
    };
    db.reports = [report, ...db.reports.filter((r) => r.code !== report.code)];
    result = { code: report.code, version };
    log(db, actorId, version === 1 ? "প্রতিবেদন তৈরি করেছেন" : `প্রতিবেদনের ভার্সন ${bn(version)} তৈরি করেছেন`, report.code);
  });
  return result;
}

/** Coverage key for display, e.g. in success messages. */
export const areaLabel = (p: Pick<Profile, "district" | "thana">) => coverageKey(p);
