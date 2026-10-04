"use client";

// The session cookie as a browser-side external store. Shared by the data store (to pick the
// signed-in organisation) and by sign-in code, so both react to the same cookie changes.

import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import { parseSession, serializeSession, SESSION_COOKIE, type Session } from "./session";

const listeners = new Set<() => void>();

export function readSessionCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return match ? match.slice(SESSION_COOKIE.length + 1) : "";
}

/** The current session from the cookie (client), or null. */
export const currentSession = () => parseSession(readSessionCookie());

export function writeSessionCookie(value: string, maxAge: number) {
  document.cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  listeners.forEach((fn) => fn());
}

export function subscribeSession(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const InitialSession = createContext<Session | null>(null);

/** Seeds the session read on the server, so the first render matches the cookie. */
export function SessionProvider({ initial, children }: { initial: Session | null; children: ReactNode }) {
  return createElement(InitialSession.Provider, { value: initial }, children);
}

/** The signed-in session, or null. */
export function useSession(): Session | null {
  const initial = useContext(InitialSession);
  const raw = useSyncExternalStore(subscribeSession, readSessionCookie, () => (initial ? serializeSession(initial) : ""));
  return parseSession(raw);
}
