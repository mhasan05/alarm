"use client";

// Browser-side sign-in for the frontend preview. Checks credentials against the mock store, blocks
// suspended accounts and suspended organisations, and writes the session cookie the proxy reads.

import { normalisePhone, nowIso } from "./db/format";
import { getRoot, updateRoot, useDb, useRoot } from "./db/store";
import { currentSession, useSession, writeSessionCookie } from "./session-client";
import { HOME, safeNext, serializeSession, SESSION_MAX_AGE, type Session } from "./session";

export { SessionProvider, useSession } from "./session-client";

export type LoginResult = { ok: true; to: string } | { ok: false; error: string; field?: "phone" | "password"; blocked?: boolean };

const startSession = (s: Session) => writeSessionCookie(serializeSession(s), SESSION_MAX_AGE);

/** Sign in with a mobile number and password. `next` is honoured only for the account's own portal. */
export function login(phoneInput: string, password: string, next?: string | null): LoginResult {
  const phone = normalisePhone(phoneInput);
  if (!phone) return { ok: false, field: "phone", error: "সঠিক মোবাইল নম্বর দিন — যেমন ০১৭১১-২৩৪৫৬৭।" };
  const wrong: LoginResult = { ok: false, field: "password", error: "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।" };

  const root = getRoot();
  if (root.superAdmin.phone === phone) {
    if (root.superAdmin.password !== password) return wrong;
    startSession({ userId: root.superAdmin.id, role: "superadmin" });
    return { ok: true, to: safeNext(next, "superadmin") };
  }

  const org = root.orgs.find((o) => o.db.users.some((u) => u.phone === phone));
  const user = org?.db.users.find((u) => u.phone === phone);
  if (!org || !user || user.password !== password) return wrong;
  // A suspended organisation is closed for everyone in it, its প্রধান নির্বাহী সম্পাদক included.
  if (org.status === "Suspended") return { ok: false, blocked: true, error: "আপনার প্রতিষ্ঠানের সিস্টেম বন্ধ করা হয়েছে। সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।" };

  const db = org.db;
  const status =
    user.role === "politician"
      ? db.profiles.find((p) => p.id === user.subjectId)?.account
      : user.role === "staff"
        ? db.staff.find((s) => s.id === user.subjectId)?.status
        : user.role === "reviewer"
          ? db.reviewers.find((r) => r.id === user.subjectId)?.status
          : "Active";
  if (status === "Suspended") return { ok: false, blocked: true, error: "এই অ্যাকাউন্ট বন্ধ আছে। প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।" };
  if (status === "Deactivated" || status === undefined) return { ok: false, blocked: true, error: "এই অ্যাকাউন্ট চালু নেই। প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।" };

  startSession({ userId: user.id, role: user.role, org: org.id });
  return { ok: true, to: safeNext(next, user.role) };
}

export function logout() {
  writeSessionCookie("", 0);
}

const superLog = (action: string, target: string) =>
  updateRoot((r) => {
    r.audit.unshift({ at: nowIso(), actor: r.superAdmin.id, action, target });
  });

/**
 * The সুপার অ্যাডমিন opens an organisation as its প্রধান নির্বাহী সম্পাদক, in one click. Returns the page to
 * go to, or an error. The session remembers the সুপার অ্যাডমিন so they can switch back.
 */
export function actAsAdmin(orgId: string): { ok: true; to: string } | { ok: false; error: string } {
  const s = currentSession();
  const root = getRoot();
  if (s?.role !== "superadmin" || s.userId !== root.superAdmin.id) return { ok: false, error: "শুধু সুপার অ্যাডমিন এটি করতে পারেন।" };
  const org = root.orgs.find((o) => o.id === orgId);
  if (!org) return { ok: false, error: "প্রতিষ্ঠানটি পাওয়া যায়নি।" };
  if (org.status === "Suspended") return { ok: false, error: "বন্ধ প্রতিষ্ঠানে প্রবেশ করা যায় না — আগে আবার চালু করুন।" };
  superLog("প্রধান নির্বাহী সম্পাদকের অ্যাকাউন্টে প্রবেশ করেছেন", org.id);
  startSession({ userId: org.adminId, role: "admin", org: org.id, actor: s.userId });
  return { ok: true, to: HOME.admin };
}

/** Back from an admin's account to the সুপার অ্যাডমিন portal. */
export function returnToSuper(): string | null {
  const s = currentSession();
  if (!s?.actor || s.actor !== getRoot().superAdmin.id) return null;
  superLog("সুপার অ্যাডমিন পোর্টালে ফিরেছেন", s.org ?? "");
  startSession({ userId: s.actor, role: "superadmin" });
  return HOME.superadmin;
}

/** The signed-in account with its record resolved from its own organisation. */
export function useMe() {
  const session = useSession();
  const db = useDb();
  const root = useRoot();
  if (!session) return null;
  const { userId, role } = session;
  return {
    ...session,
    superAdmin: role === "superadmin" && root.superAdmin.id === userId ? root.superAdmin : undefined,
    admin: role === "admin" ? db.admins.find((a) => a.id === userId) : undefined,
    reviewer: role === "reviewer" ? db.reviewers.find((r) => r.id === userId) : undefined,
    staff: role === "staff" ? db.staff.find((s) => s.id === userId) : undefined,
    profile: role === "politician" ? db.profiles.find((p) => p.id === userId) : undefined,
  };
}
