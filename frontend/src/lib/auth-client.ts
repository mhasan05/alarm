"use client";

// Browser-side sign-in for the frontend preview. Checks credentials against the mock database, blocks
// suspended or unapproved accounts, and writes the session cookie the proxy reads.

import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import { normalisePhone } from "./db/format";
import { getDb, useDb } from "./db/store";
import { parseSession, safeNext, serializeSession, SESSION_COOKIE, SESSION_MAX_AGE, type Session } from "./session";

const listeners = new Set<() => void>();

function readCookie(): string {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return match ? match.slice(SESSION_COOKIE.length + 1) : "";
}

function writeCookie(value: string, maxAge: number) {
  document.cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  listeners.forEach((fn) => fn());
}

export type LoginResult = { ok: true; to: string } | { ok: false; error: string; field?: "phone" | "password"; blocked?: boolean };

/** Sign in with a mobile number and password. `next` is honoured only for the account's own portal. */
export function login(phoneInput: string, password: string, next?: string | null): LoginResult {
  const phone = normalisePhone(phoneInput);
  if (!phone) return { ok: false, field: "phone", error: "সঠিক মোবাইল নম্বর দিন — যেমন ০১৭১১-২৩৪৫৬৭।" };

  const db = getDb();
  const user = db.users.find((u) => u.phone === phone);
  if (!user || user.password !== password) return { ok: false, field: "password", error: "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।" };

  const status =
    user.role === "politician"
      ? db.profiles.find((p) => p.id === user.subjectId)?.account
      : user.role === "staff"
        ? db.staff.find((s) => s.id === user.subjectId)?.status
        : user.role === "reviewer"
          ? db.reviewers.find((r) => r.id === user.subjectId)?.status
          : "Active";
  if (status === "Suspended") return { ok: false, blocked: true, error: "এই অ্যাকাউন্ট স্থগিত আছে। অ্যাডমিনের সাথে যোগাযোগ করুন।" };
  if (status === "Deactivated" || status === undefined) return { ok: false, blocked: true, error: "এই অ্যাকাউন্ট সক্রিয় নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।" };

  const session: Session = { userId: user.id, role: user.role };
  writeCookie(serializeSession(session), SESSION_MAX_AGE);
  return { ok: true, to: safeNext(next, user.role) };
}

export function logout() {
  writeCookie("", 0);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const InitialSession = createContext<Session | null>(null);

/** Seeds the session read on the server, so the first render matches the cookie. */
export function SessionProvider({ initial, children }: { initial: Session | null; children: ReactNode }) {
  return createElement(InitialSession.Provider, { value: initial }, children);
}

/** The signed-in session, or null. */
export function useSession(): Session | null {
  const initial = useContext(InitialSession);
  const raw = useSyncExternalStore(subscribe, readCookie, () => (initial ? serializeSession(initial) : ""));
  return parseSession(raw);
}

/** The signed-in account with its record resolved from the database. */
export function useMe() {
  const session = useSession();
  const db = useDb();
  if (!session) return null;
  const { userId, role } = session;
  return {
    ...session,
    admin: role === "admin" ? db.admins.find((a) => a.id === userId) : undefined,
    reviewer: role === "reviewer" ? db.reviewers.find((r) => r.id === userId) : undefined,
    staff: role === "staff" ? db.staff.find((s) => s.id === userId) : undefined,
    profile: role === "politician" ? db.profiles.find((p) => p.id === userId) : undefined,
  };
}
