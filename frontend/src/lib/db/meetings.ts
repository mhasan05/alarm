"use client";

// Meetings: the admin creates a meeting for an area (নির্বাচনী এলাকা) and shares its link. People enter
// their ALARM ID (KAR-…): those whose area falls inside the meeting's area — or who were invited by
// name — join directly; anyone else can ask, and the admin decides. Presence lives in the store so
// every open tab sees who is in the room.

import { locateArea } from "../geo";
import { toSafeHtml } from "../rich-text";
import { bn, nowIso } from "./format";
import { nameBnOf, nextCode, roleOfId, type AccountRole } from "./selectors";
import { update } from "./store";
import type { Database, Meeting, MeetingArea, MeetingPresence } from "./types";

/** A participant counts as in the room while their tab has checked in within this window. */
export const PRESENCE_TTL_MS = 45_000;
export const HEARTBEAT_MS = 15_000;

const log = (db: Database, actor: string, action: string, target: string) => db.audit.unshift({ at: nowIso(), actor, action, target });
const find = (db: Database, id: string) => db.meetings.find((m) => m.id === id);

/** "f9xd-4gem-q2vr" — 12 characters without look-alikes. */
function newCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const rnd = new Uint32Array(12);
  crypto.getRandomValues(rnd);
  const s = Array.from(rnd, (n) => chars[n % chars.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

// ── Selectors ───────────────────────────────────────────────────────────────

export const meetingByCode = (db: Database, code: string) => db.meetings.find((m) => m.code === code);
export const meetingById = (db: Database, id: string) => find(db, id);

export const activePresence = (m: Meeting, now = Date.now()): MeetingPresence[] =>
  m.status === "live" ? m.presence.filter((p) => now - new Date(p.lastSeen).getTime() < PRESENCE_TTL_MS) : [];

export const pendingRequests = (m: Meeting) => m.requests.filter((r) => r.state === "pending");

// ── Area ────────────────────────────────────────────────────────────────────

export const EMPTY_AREA: MeetingArea = { division: "", district: "", upazila: "", thana: "", ward: "" };
export const isNationwide = (a: MeetingArea) => !a.division && !a.district && !a.upazila && !a.thana && !a.ward;

/** Most specific first: "ওয়ার্ড ১২, মিরপুর মডেল, ঢাকা জেলা" — or "সারা দেশ". */
export function areaLabel(a: MeetingArea) {
  if (isNationwide(a)) return "সারা দেশ";
  const parts = [a.ward, a.thana, a.upazila, a.district && `${a.district} জেলা`, a.division && `${a.division} বিভাগ`].filter(Boolean);
  return parts.slice(0, 3).join(", ");
}

type Place = { division: string; district: string; upazila: string; thana: string; wards: number[] | "all" };

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toNum = (s: string) => Number(s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d))));
/** "ওয়ার্ড ১২, ১৪" → [12, 14]; "সব ওয়ার্ড" or empty → all. */
function parseWards(w: string): number[] | "all" {
  if (!w || w.includes("সব")) return "all";
  const nums = w.match(/[০-৯0-9]+/g)?.map(toNum) ?? [];
  return nums.length ? nums : "all";
}

/** Where a person works: a political activist's or staff member's area, or each of a reviewer's coverage areas. */
function placesOf(db: Database, userId: string): Place[] {
  const p = db.profiles.find((x) => x.id === userId) ?? db.staff.find((x) => x.id === userId);
  if (p) return [{ division: p.division, district: p.district, upazila: p.upazila, thana: p.thana, wards: parseWards(p.wards) }];
  const r = db.reviewers.find((x) => x.id === userId);
  if (!r) return [];
  return r.areas.map((key) => {
    const [district, thana] = key.split(" · ");
    const loc = locateArea(district, thana);
    return { division: loc.division ?? "", district, upazila: loc.upazila ?? "", thana, wards: "all" as const };
  });
}

const within = (a: MeetingArea, p: Place) =>
  (!a.division || a.division === p.division) &&
  (!a.district || a.district === p.district) &&
  (!a.upazila || a.upazila === p.upazila) &&
  (!a.thana || a.thana === p.thana) &&
  (!a.ward || p.wards === "all" || p.wards.includes(toNum(a.ward.match(/[০-৯0-9]+/)?.[0] ?? "")));

/** True when any of the person's areas falls inside the meeting's area. */
export const inMeetingArea = (db: Database, m: Meeting, userId: string) => isNationwide(m.area) || placesOf(db, userId).some((p) => within(m.area, p));

/** Active accounts whose area falls inside `area` (for the admin's preview). */
export function areaMembers(db: Database, area: MeetingArea) {
  return db.users
    .filter((u) => u.role !== "admin" && identifyForMeeting(db, u.id).ok)
    .filter((u) => isNationwide(area) || placesOf(db, u.id).some((p) => within(area, p)));
}

// ── Access ──────────────────────────────────────────────────────────────────

export type MeetingAccess = "host" | "invited" | "area" | "approved" | "pending" | "declined" | "removed" | "outside";

/** What a user may do with this meeting. */
export function accessOf(db: Database, m: Meeting, userId: string, role: AccountRole): MeetingAccess {
  if (role === "admin") return "host";
  if (m.removed.includes(userId)) return "removed";
  if (m.invitees.includes(userId)) return "invited";
  if (inMeetingArea(db, m, userId)) return "area";
  const req = m.requests.find((r) => r.userId === userId);
  if (req?.state === "approved") return "approved";
  if (req?.state === "pending") return "pending";
  if (req?.state === "declined") return "declined";
  return "outside";
}
export const canEnter = (a: MeetingAccess) => a === "host" || a === "invited" || a === "area" || a === "approved";

/** Meetings a user is part of: in the area, invited, approved, or with a request on file. */
export const meetingsFor = (db: Database, userId: string) =>
  db.meetings.filter(
    (m) =>
      m.invitees.includes(userId) ||
      m.requests.some((r) => r.userId === userId) ||
      m.attended.includes(userId) ||
      ((m.status === "live" || m.status === "scheduled") && inMeetingArea(db, m, userId)),
  );

const ROLE_BN: Record<AccountRole, string> = { admin: "প্রধান নির্বাহী সম্পাদক", reviewer: "নির্বাহী সম্পাদক", staff: "তদন্ত সম্পাদক", politician: "রাজনৈতিক কর্মী" };
export const roleLabel = (db: Database, userId: string) => {
  const r = roleOfId(db, userId);
  return r === "system" ? "" : ROLE_BN[r];
};

/**
 * The name a viewer sees for a participant, following the visibility rules: field staff never see
 * reviewer names, reviewers see "তদন্ত সম্পাদক" instead of staff names, and political activists see
 * neither. Hidden names become the role label, numbered when there are several.
 */
export function participantNames(db: Database, viewerId: string, viewerRole: AccountRole, userIds: string[]): Map<string, string> {
  const hides = (target: string) => {
    if (target === viewerId || viewerRole === "admin") return false;
    const r = roleOfId(db, target);
    if (viewerRole === "staff") return r === "reviewer";
    if (viewerRole === "reviewer") return r === "staff";
    if (viewerRole === "politician") return r === "staff" || r === "reviewer";
    return false;
  };
  const counts = new Map<string, number>();
  const out = new Map<string, string>();
  for (const id of userIds) {
    if (!hides(id)) {
      out.set(id, nameBnOf(db, id));
      continue;
    }
    const label = roleLabel(db, id);
    const n = (counts.get(label) ?? 0) + 1;
    counts.set(label, n);
    out.set(id, n === 1 ? label : `${label} ${bn(n)}`);
  }
  // Number the first one too when a label repeats.
  for (const [label, n] of counts) if (n > 1) for (const [id, v] of out) if (v === label) out.set(id, `${label} ১`);
  return out;
}

// ── Joining by ALARM ID ─────────────────────────────────────────────────────

export type MeetingIdentity = { userId: string; role: AccountRole };
export type IdentifyResult = { ok: true; identity: MeetingIdentity } | { ok: false; error: string; needsLogin?: boolean };

/** "kar 123456" → "KAR123456", so IDs match however they're typed. */
const squash = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Meeting links don't need a sign-in: people identify with their ALARM ID (KAR-…).
 * Admin IDs must sign in, since the admin hosts and controls the room.
 */
export function identifyForMeeting(db: Database, input: string): IdentifyResult {
  const id = squash(input);
  if (!id) return { ok: false, error: "আপনার ALARM আইডি লিখুন — যেমন KAR-123456।" };
  const user = db.users.find((u) => squash(u.id) === id);
  if (!user) return { ok: false, error: "এই আইডি পাওয়া যায়নি। আইডিটি আবার দেখে লিখুন।" };
  if (user.role === "admin") return { ok: false, needsLogin: true, error: "প্রধান নির্বাহী সম্পাদক হিসেবে মিটিং চালাতে লগইন করুন।" };
  const status =
    user.role === "politician"
      ? db.profiles.find((p) => p.id === user.subjectId)?.account
      : user.role === "staff"
        ? db.staff.find((x) => x.id === user.subjectId)?.status
        : db.reviewers.find((x) => x.id === user.subjectId)?.status;
  if (status === "Suspended" || status === "Deactivated" || status === undefined) return { ok: false, error: "এই অ্যাকাউন্টটি চালু নেই। প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।" };
  return { ok: true, identity: { userId: user.id, role: user.role } };
}

// ── Admin actions ───────────────────────────────────────────────────────────

export type MeetingInput = { title: string; agenda: string; scheduledAt: string; area: MeetingArea; invitees: string[] };

export function createMeeting(input: MeetingInput, actorId: string): Meeting {
  let created!: Meeting;
  update((db) => {
    const codes = new Set(db.meetings.map((m) => m.code));
    let code = newCode();
    while (codes.has(code)) code = newCode();
    created = {
      ...input,
      agenda: toSafeHtml(input.agenda),
      id: nextCode(db.meetings.map((m) => m.id), "MTG", 3),
      code,
      createdBy: actorId,
      createdAt: nowIso(),
      status: "scheduled",
      requests: [],
      presence: [],
      attended: [],
      removed: [],
    };
    db.meetings.unshift(created);
    log(db, actorId, "মিটিং তৈরি করেছেন", created.id);
  });
  return created;
}

export function updateMeeting(id: string, patch: Partial<MeetingInput>, actorId: string) {
  update((db) => {
    const m = find(db, id);
    if (!m) return;
    Object.assign(m, patch.agenda === undefined ? patch : { ...patch, agenda: toSafeHtml(patch.agenda) });
    log(db, actorId, "মিটিং আপডেট করেছেন", id);
  });
}

export function setInvitees(id: string, invitees: string[], actorId: string) {
  update((db) => {
    const m = find(db, id);
    if (!m) return;
    m.invitees = invitees;
    // An invitation clears a removal and settles any open request.
    m.removed = m.removed.filter((u) => !invitees.includes(u));
    for (const r of m.requests) if (invitees.includes(r.userId) && r.state === "pending") Object.assign(r, { state: "approved", decidedAt: nowIso(), decidedBy: actorId });
    log(db, actorId, "মিটিংয়ের আমন্ত্রণ আপডেট করেছেন", id);
  });
}

export function startMeeting(id: string, actorId: string) {
  update((db) => {
    const m = find(db, id);
    if (!m || m.status !== "scheduled") return;
    m.status = "live";
    m.startedAt = nowIso();
    log(db, actorId, "মিটিং শুরু করেছেন", id);
  });
}

export function endMeeting(id: string, actorId: string) {
  update((db) => {
    const m = find(db, id);
    if (!m || m.status !== "live") return;
    m.status = "ended";
    m.endedAt = nowIso();
    m.presence = [];
    log(db, actorId, "মিটিং শেষ করেছেন", id);
  });
}

export function cancelMeeting(id: string, actorId: string) {
  update((db) => {
    const m = find(db, id);
    if (!m || m.status !== "scheduled") return;
    m.status = "cancelled";
    log(db, actorId, "মিটিং বাতিল করেছেন", id);
  });
}

export function decideJoin(id: string, userId: string, approve: boolean, actorId: string) {
  update((db) => {
    const m = find(db, id);
    const r = m?.requests.find((x) => x.userId === userId);
    if (!m || !r) return;
    Object.assign(r, { state: approve ? "approved" : "declined", decidedAt: nowIso(), decidedBy: actorId });
    if (approve) m.removed = m.removed.filter((u) => u !== userId);
    log(db, actorId, approve ? "মিটিংয়ে যোগ দেওয়ার অনুরোধ মেনে নিয়েছেন" : "মিটিংয়ে যোগ দেওয়ার অনুরোধ ফিরিয়ে দিয়েছেন", `${id} · ${userId}`);
  });
}

/** Admin removes someone from the room; they can't rejoin this meeting. */
export function removeFromMeeting(id: string, userId: string, actorId: string) {
  update((db) => {
    const m = find(db, id);
    if (!m) return;
    m.presence = m.presence.filter((p) => p.userId !== userId);
    if (!m.removed.includes(userId)) m.removed.push(userId);
    log(db, actorId, "মিটিং থেকে সরিয়ে দিয়েছেন", `${id} · ${userId}`);
  });
}

// ── Participant actions ─────────────────────────────────────────────────────

export function requestJoin(id: string, userId: string, note: string) {
  update((db) => {
    const m = find(db, id);
    if (!m) return;
    const existing = m.requests.find((r) => r.userId === userId);
    if (existing) Object.assign(existing, { state: "pending", at: nowIso(), note, decidedAt: undefined, decidedBy: undefined });
    else m.requests.push({ userId, at: nowIso(), note, state: "pending" });
    log(db, userId, "মিটিংয়ে যোগ দেওয়ার অনুরোধ করেছেন", id);
  });
}

export function enterRoom(id: string, userId: string, muted: boolean) {
  update((db) => {
    const m = find(db, id);
    if (!m || m.status !== "live") return;
    const at = nowIso();
    m.presence = m.presence.filter((p) => p.userId !== userId);
    m.presence.push({ userId, joinedAt: at, lastSeen: at, muted, hand: false });
    if (!m.attended.includes(userId)) m.attended.push(userId);
  });
}

export function leaveRoom(id: string, userId: string) {
  update((db) => {
    const m = find(db, id);
    if (m) m.presence = m.presence.filter((p) => p.userId !== userId);
  });
}

/** Keeps the participant listed while their tab is open. */
export function heartbeat(id: string, userId: string) {
  update((db) => {
    const p = find(db, id)?.presence.find((x) => x.userId === userId);
    if (p) p.lastSeen = nowIso();
  });
}

/** Mute or unmute; the admin may mute anyone, a participant only themselves. */
export function setMuted(id: string, userId: string, muted: boolean) {
  update((db) => {
    const p = find(db, id)?.presence.find((x) => x.userId === userId);
    if (p) p.muted = muted;
  });
}

export function setHand(id: string, userId: string, hand: boolean) {
  update((db) => {
    const p = find(db, id)?.presence.find((x) => x.userId === userId);
    if (p) p.hand = hand;
  });
}
