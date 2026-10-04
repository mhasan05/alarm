// Session format shared by the proxy (server) and the browser. In this frontend-only build the session
// is a cookie naming the signed-in account and its role; the backend will replace it with a signed token.

import type { Role } from "./db/types";

export const SESSION_COOKIE = "alarm_session";

/** Signed-in sessions last one working day. */
export const SESSION_MAX_AGE = 60 * 60 * 10;

export type Session = { userId: string; role: Role };

const ROLES: Role[] = ["admin", "reviewer", "staff", "politician"];

export function parseSession(value: string | undefined | null): Session | null {
  if (!value) return null;
  const [userId, role] = decodeURIComponent(value).split(":");
  return userId && ROLES.includes(role as Role) ? { userId, role: role as Role } : null;
}

export const serializeSession = (s: Session) => encodeURIComponent(`${s.userId}:${s.role}`);

/** Each role's home page. */
export const HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  reviewer: "/reviewer/dashboard",
  staff: "/staff/dashboard",
  politician: "/politician/dashboard",
};

/** The portal (URL prefix) each role may open. */
export const PORTAL: Record<Role, string> = {
  admin: "/admin",
  reviewer: "/reviewer",
  staff: "/staff",
  politician: "/politician",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "প্রধান নির্বাহী সম্পাদক",
  reviewer: "নির্বাহী সম্পাদক",
  staff: "তদন্ত সম্পাদক",
  politician: "রাজনৈতিক কর্মী",
};

/** Which role owns a path, or null for public pages. */
export function roleForPath(pathname: string): Role | null {
  return ROLES.find((r) => pathname === PORTAL[r] || pathname.startsWith(`${PORTAL[r]}/`)) ?? null;
}

/** A `next` target is only honoured if it's a local path the role may open. */
export function safeNext(next: string | null | undefined, role: Role): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return HOME[role];
  if (/^\/meet\/[a-z0-9-]+$/.test(next)) return next;
  return roleForPath(next) === role ? next : HOME[role];
}
