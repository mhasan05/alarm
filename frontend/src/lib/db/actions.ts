"use client";

// Every change to the data goes through these functions. Each one records an audit entry, so the
// audit log reflects real activity. They mirror the endpoints the backend will expose.

import { bn, nowIso } from "./format";
import {
  activeReviewersFor,
  coverageKey,
  nameBnOf,
  nextCode,
  profileOf,
  reviewersFor,
  staffOf,
  submissionOf,
  submissionsFor,
} from "./selectors";
import { getDb, update } from "./store";
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

/** A new ALARM ID: KAR- + 6 random digits, unique across every account. It is the account's primary key. */
function newAlarmId(db: Database) {
  const taken = new Set([...db.users.map((u) => u.id), ...db.admins.map((a) => a.id), ...db.reviewers.map((r) => r.id), ...db.staff.map((x) => x.id), ...db.profiles.map((p) => p.id)]);
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
      body: input.body.trim(),
      facts: input.facts ?? [],
      evidence: input.evidence.map((e) => ({ ...e, id: `EV-${String(id++).padStart(4, "0")}` })),
      state: "Pending",
      submittedAt: at,
      events: [{ at, by: actorId, type: "submitted" }],
    });
    log(db, actorId, input.origin === "self" ? "Added own activity" : "Submitted evidence", code);
  });
  return code;
}

export type SubmissionEdits = Partial<Pick<Submission, "title" | "body" | "source" | "category">> & { evidence?: Evidence[] };

/** A reviewer or admin corrects details or evidence before deciding. */
export function editSubmission(code: string, actorId: string, edits: SubmissionEdits) {
  update((db) => {
    const s = submissionOf(db, code);
    if (!s) return;
    Object.assign(s, edits);
    s.events.push({ at: nowIso(), by: actorId, type: "edited" });
    log(db, actorId, "Edited submission before decision", code);
  });
}

export type Decision = "Accepted" | "Rejected" | "Held" | "Revisit";

/** Accept, reject, hold, or send back for a re-visit (stays pending). */
export function decide(code: string, actorId: string, decision: Decision, reason: string, edits?: SubmissionEdits) {
  update((db) => {
    const s = submissionOf(db, code);
    if (!s) return;
    const at = nowIso();
    if (edits) {
      Object.assign(s, edits);
      s.events.push({ at, by: actorId, type: "edited" });
    }
    if (decision === "Revisit") {
      s.state = "Pending";
      s.decidedAt = undefined;
      s.decidedBy = undefined;
      s.reason = reason;
      s.events.push({ at, by: actorId, type: "revisit", note: reason });
      log(db, actorId, "Requested a re-visit", code);
      return;
    }
    s.state = decision;
    s.decidedAt = at;
    s.decidedBy = actorId;
    s.reason = reason;
    s.events.push({ at, by: actorId, type: decision === "Accepted" ? "accepted" : decision === "Held" ? "held" : "rejected", note: reason });
    log(db, actorId, decision === "Accepted" ? "Accepted submission" : decision === "Held" ? "Held submission — source unclear" : "Rejected submission", code);
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
    log(db, actorId, "Undid decision", code);
  });
}

// ── Disputes ────────────────────────────────────────────────────────────────

export function fileDispute(input: { submissionCode: string; reason: string; claim: string; attachments: string[] }, actorId: string): string {
  let code = "";
  update((db) => {
    const s = submissionOf(db, input.submissionCode);
    if (!s) return;
    code = nextCode(db.disputes.map((d) => d.code), "DSP", 3);
    db.disputes.push({ code, submissionCode: s.code, profileId: s.profileId, reason: input.reason, claim: input.claim.trim(), attachments: input.attachments, filedAt: nowIso(), state: "Open" });
    log(db, actorId, "Filed dispute", code);
  });
  return code;
}

export type DisputeOutcome = Exclude<DisputeState, "Open">;

/** Keep the report, add the politician's response under it, or withdraw it from the profile. */
export function decideDispute(code: string, actorId: string, outcome: DisputeOutcome, reason: string) {
  update((db) => {
    const d = db.disputes.find((x) => x.code === code);
    if (!d) return;
    const s = submissionOf(db, d.submissionCode);
    d.state = outcome;
    d.decidedAt = nowIso();
    d.decidedBy = actorId;
    d.decisionReason = reason.trim();
    if (s && outcome === "Response") s.response = d.claim;
    if (s && outcome === "Removed") {
      s.state = "Withdrawn";
      s.events.push({ at: d.decidedAt, by: actorId, type: "withdrawn", note: reason });
    }
    log(db, actorId, outcome === "Kept" ? "Decided dispute — report kept" : outcome === "Response" ? "Decided dispute — response added" : "Decided dispute — report removed", code);
  });
}

export function undoDisputeDecision(code: string, actorId: string) {
  update((db) => {
    const d = db.disputes.find((x) => x.code === code);
    if (!d) return;
    const s = submissionOf(db, d.submissionCode);
    if (s && d.state === "Response") s.response = undefined;
    if (s && d.state === "Removed") {
      s.state = "Accepted";
      if (s.events.at(-1)?.type === "withdrawn") s.events.pop();
    }
    d.state = "Open";
    d.decidedAt = d.decidedBy = d.decisionReason = undefined;
    log(db, actorId, "Reopened dispute", code);
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
    log(db, actorId, "Created political activist account", id);
  });
  return id;
}

export function setProfileAccount(id: string, actorId: string, account: Profile["account"]) {
  update((db) => {
    const p = profileOf(db, id);
    if (!p) return;
    p.account = account;
    log(db, actorId, account === "Active" ? "Restored political activist account" : account === "Suspended" ? "Suspended political activist account" : "Deactivated political activist account", id);
  });
}

export function setStaffStatus(id: string, actorId: string, status: StaffStatus) {
  update((db) => {
    const s = staffOf(db, id);
    if (!s) return;
    s.status = status;
    log(db, actorId, status === "Suspended" ? "Suspended account" : status === "Deactivated" ? "Deactivated account" : "Restored account", id);
  });
}

export function setReviewerStatus(id: string, actorId: string, status: ReviewerStatus) {
  update((db) => {
    const r = db.reviewers.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    log(db, actorId, status === "Suspended" ? "Suspended account" : status === "Deactivated" ? "Deactivated account" : "Restored account", id);
  });
}

export function resetPassword(id: string, actorId: string) {
  update((db) => log(db, actorId, "Sent a temporary password", id));
}

/** Change the signed-in user's password. Returns an error message, or "" on success. */
export function changePassword(userId: string, current: string, next: string): string {
  const user = getDb().users.find((u) => u.id === userId);
  if (!user) return "অ্যাকাউন্ট পাওয়া যায়নি।";
  if (user.password !== current) return "বর্তমান পাসওয়ার্ড সঠিক নয়।";
  update((db) => {
    const u = db.users.find((x) => x.id === userId);
    if (u) u.password = next;
    log(db, userId, "Changed password", userId);
  });
  return "";
}

/** Set a new password after the phone was verified by OTP. Returns an error message, or "" on success. */
export function resetPasswordWithOtp(phone: string, next: string): string {
  const user = getDb().users.find((u) => u.phone === phone);
  if (!user) return "এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট নেই।";
  update((db) => {
    const u = db.users.find((x) => x.phone === phone);
    if (u) u.password = next;
    log(db, user.id, "Reset password with OTP", user.id);
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
      device: { app: "—", lastSync: "Not signed in yet", pending: 0 },
      note: draft ? "Draft — the account is not active and no invite was sent." : "Invite sent — the account activates when they sign in on the app.",
    };
    db.staff.push(staff);
    if (!draft) db.users.push({ id, role: "staff", phone: input.phone, password: input.password, subjectId: id });
    log(db, actorId, draft ? "Saved investigation editor draft" : "Created investigation editor account", id);
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
    log(db, actorId, "Updated investigation editor profile", id);
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
      note: draft ? "Draft — the account is not active and no invite was sent." : undefined,
    };
    db.reviewers.push(reviewer);
    if (!draft) db.users.push({ id, role: "reviewer", phone: input.phone, password: input.password, subjectId: id });
    log(db, actorId, draft ? "Saved executive editor draft" : "Created executive editor account", id);
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
    log(db, actorId, "Updated executive editor profile", id);
  });
}

export function setCoverage(reviewerId: string, areas: string[], actorId: string) {
  update((db) => {
    const r = db.reviewers.find((x) => x.id === reviewerId);
    if (!r) return;
    r.areas = areas;
    log(db, actorId, "Assigned executive editor coverage", reviewerId);
  });
}

export function assign(input: Omit<Assignment, "id" | "open">, actorId: string) {
  update((db) => {
    const id = nextCode(db.assignments.map((a) => a.id), "ASG", 2);
    db.assignments.push({ ...input, id, open: true });
    log(db, actorId, "Assigned investigation editor", `${input.staffId} → ${input.profileId}`);
  });
}

// ── Settings ────────────────────────────────────────────────────────────────

export function saveSettings(patch: Partial<Settings>, actorId: string, what: string) {
  update((db) => {
    db.settings = { ...db.settings, ...patch };
    log(db, actorId, `Updated settings — ${what}`, "Settings");
  });
}

export function saveParties(parties: Database["parties"], actorId: string) {
  update((db) => {
    db.parties = parties;
    log(db, actorId, "Updated parties & organisations", "Settings");
  });
}

// ── Analysis & reports ──────────────────────────────────────────────────────

const REPORT_SIGNATURE = () => {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, "0");
  return `${hex()}·${hex()}`;
};

/**
 * Cut a report from the kept findings. A profile that already has a report gets a new version;
 * otherwise a new report code is issued. The report waits for the reviewer's sign-off.
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
          ? `ব্যক্তি অভিযোগ (${dispute.code}) দাখিল করেছেন; প্রধান নির্বাহী সম্পাদকের সিদ্ধান্তের অপেক্ষায়। ততক্ষণ সিদ্ধান্তটি অপরিবর্তিত।`
          : dispute?.state === "Response"
            ? `ব্যক্তির বক্তব্য (${dispute.code}): ${dispute.claim}`
            : s.category === "নেতিবাচক"
              ? s.reason
              : undefined;
      return finding({ title: s.title, refs: [ref], remark, kind: s.category === "নেতিবাচক" ? "মাঠ এভিডেন্স" : undefined });
    };
    const fromAi = (f: AiFinding) => {
      const refs = Array.from({ length: f.sources }, (_, i) => cite(i === 0 ? f.meta.split(" · ")[0] : `${f.meta.split(" · ")[0]} (সংযুক্ত সূত্র)`, "পাবলিক রেকর্ড · এআই কর্তৃক প্রাপ্ত"));
      return finding({ title: f.title, refs, kind: f.category === "নেতিবাচক" ? "পাবলিক রেকর্ড" : undefined });
    };

    const positive = [...subs.filter((s) => s.category === "ইতিবাচক").map(fromSub), ...ai.filter((f) => f.category === "ইতিবাচক").map(fromAi)];
    const negative = [...subs.filter((s) => s.category === "নেতিবাচক").map(fromSub), ...ai.filter((f) => f.category === "নেতিবাচক").map(fromAi)];
    const at = nowIso();
    const existing = db.reports.find((r) => r.profileId === profileId);
    const reviewer = activeReviewersFor(db, profileId)[0] ?? reviewersFor(db, profileId)[0] ?? db.reviewers.find((r) => r.status === "Active");
    const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(at));
    const version = (existing?.versions[0]?.v ?? 0) + 1;
    const confidence = Math.min(92, 58 + sources.length * 3);

    const report: FinalReport = {
      code: existing?.code ?? nextCode(db.reports.map((r) => r.code), "RPT-2026", 4),
      profileId,
      state: "pending",
      published: at,
      versions: [
        {
          v: version,
          title: version === 1 ? "Initial report" : "Re-analysed and re-cut",
          why: version === 1 ? "প্রথম সংস্করণ · First report cut from the AI analysis review" : "নতুন গৃহীত তথ্য যোগ করার পর পুনর্বিশ্লেষণ · Re-analysed after new accepted data",
          date: dateLabel,
          positive: positive.length,
          negative: negative.length,
        },
        ...(existing?.versions ?? []),
      ],
      subject: { name: p.name, father: existing?.subject.father ?? "—", nid: p.nid, job: "রাজনৈতিক কর্মী", address: p.office || `${p.thana}, ${p.district}` },
      purpose: existing?.purpose ?? "রাজনৈতিক কর্মীর কার্যক্রম নিরীক্ষা",
      requester: existing?.requester ?? "প্রধান নির্বাহী সম্পাদক কর্তৃক শুরু",
      reviewerId: reviewer?.id ?? "",
      confidence: { pct: confidence, label: confidence >= 80 ? "উচ্চ" : confidence >= 65 ? "মাঝারি–উচ্চ" : "মাঝারি" },
      summary: `ব্যক্তির ${p.post} হিসেবে কার্যকাল তদন্ত সম্পাদকদের সংগৃহীত ও নির্বাহী সম্পাদক কর্তৃক গৃহীত তথ্য এবং পাবলিক রেকর্ডের বিপরীতে যাচাই করা হয়েছে। {pos}টি ইতিবাচক এবং {neg}টি নেতিবাচক সিদ্ধান্ত এই সংস্করণে রাখা হয়েছে। যে দাবিগুলো নিশ্চিত করা যায়নি সেগুলো প্রধান নির্বাহী সম্পাদক প্রতিবেদনে রাখেননি; সেগুলো অডিট রেকর্ডে ব্যাখ্যাসহ সংরক্ষিত আছে।`,
      summaryNote: "এই সারসংক্ষেপ এআই বিশ্লেষণ স্তর তৈরি করেছে। নির্বাহী সম্পাদকের অনুমোদনের পর এটি চূড়ান্ত হবে।",
      positive,
      negative,
      negativeIntro: "নির্বাহী সম্পাদক কর্তৃক গৃহীত এবং প্রধান নির্বাহী সম্পাদক কর্তৃক প্রতিবেদনে রাখা সিদ্ধান্ত।",
      sources,
      remark: "",
      adminNote: note.trim() || undefined,
      basis: submissionsFor(db, profileId).filter((s) => s.state === "Accepted").map((s) => s.code),
    };
    db.reports = [report, ...db.reports.filter((r) => r.code !== report.code)];
    result = { code: report.code, version };
    log(db, actorId, version === 1 ? "Generated report" : `Generated report version ${version}`, report.code);
  });
  return result;
}

/** The reviewer approves and signs the latest version. */
export function signReport(code: string, reviewerId: string, remark: string) {
  update((db) => {
    const r = db.reports.find((x) => x.code === code);
    if (!r) return;
    r.state = "approved";
    r.remark = remark.trim();
    r.reviewerId = reviewerId;
    r.approval = { at: nowIso(), signature: REPORT_SIGNATURE() };
    log(db, reviewerId, "Approved and signed report", code);
  });
}

/** Coverage key for display, e.g. in success messages. */
export const areaLabel = (p: Pick<Profile, "district" | "thana">) => coverageKey(p);
