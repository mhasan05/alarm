// Session format shared by the proxy (server) and the browser. In this frontend-only build the session
// is a cookie naming the signed-in account, its role and its organisation; the backend will replace it
// with a signed token.

import type { Role } from "./db/types";

export const SESSION_COOKIE = "alarm_session";

/** Signed-in sessions last one working day. */
export const SESSION_MAX_AGE = 60 * 60 * 10;

/** Every role that can sign in: the four organisation roles plus the সুপার অ্যাডমিন above them. */
export type AppRole = Role | "superadmin";

export type Session = {
  userId: string;
  role: AppRole;
  /** The organisation (one প্রধান নির্বাহী সম্পাদক's separate system) the account belongs to. */
  org?: string;
  /** Set when the সুপার অ্যাডমিন is working inside an admin's account: the সুপার অ্যাডমিন's id. */
  actor?: string;
};

const ROLES: AppRole[] = ["superadmin", "admin", "reviewer", "staff", "politician"];

export function parseSession(value: string | undefined | null): Session | null {
  if (!value) return null;
  const [userId, role, org, actor] = decodeURIComponent(value).split(":");
  if (!userId || !ROLES.includes(role as AppRole)) return null;
  // Organisation accounts always carry their organisation; the সুপার অ্যাডমিন never does.
  if (role !== "superadmin" && !org) return null;
  return { userId, role: role as AppRole, org: role === "superadmin" ? undefined : org, actor: role === "admin" && actor ? actor : undefined };
}

export const serializeSession = (s: Session) => encodeURIComponent([s.userId, s.role, s.org ?? "", s.actor ?? ""].join(":").replace(/:+$/, ""));

/** Each role's home page. */
export const HOME: Record<AppRole, string> = {
  superadmin: "/super/dashboard",
  admin: "/admin/dashboard",
  reviewer: "/reviewer/dashboard",
  staff: "/staff/dashboard",
  politician: "/politician/dashboard",
};

/** The portal (URL prefix) each role may open. */
export const PORTAL: Record<AppRole, string> = {
  superadmin: "/super",
  admin: "/admin",
  reviewer: "/reviewer",
  staff: "/staff",
  politician: "/politician",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: "সুপার অ্যাডমিন",
  admin: "প্রধান নির্বাহী সম্পাদক",
  reviewer: "নির্বাহী সম্পাদক",
  staff: "তদন্ত সম্পাদক",
  politician: "রাজনৈতিক কর্মী",
};

/** Which role owns a path, or null for public pages. */
export function roleForPath(pathname: string): AppRole | null {
  return ROLES.find((r) => pathname === PORTAL[r] || pathname.startsWith(`${PORTAL[r]}/`)) ?? null;
}

/** A `next` target is only honoured if it's a local path the role may open. */
export function safeNext(next: string | null | undefined, role: AppRole): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return HOME[role];
  if (/^\/meet\/[a-z0-9-]+$/.test(next) && role !== "superadmin") return next;
  return roleForPath(next) === role ? next : HOME[role];
}
