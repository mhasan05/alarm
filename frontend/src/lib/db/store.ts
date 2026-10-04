"use client";

// Client-side mock database. Persists to localStorage (per browser), syncs across tabs, and exposes React
// hooks. The backend will replace this module with API calls.
//
// Multi-tenant: the store holds the সুপার অ্যাডমিন and a list of organisations, each with its own Database.
// Portal code only ever sees the *current* organisation — the one in the session cookie (or, for a
// signed-out visitor on a meeting link, the meeting's organisation) — so one organisation's data never
// reaches another's screens. Server renders and hydration use the seed, so markup always matches.

import { useContext, useSyncExternalStore } from "react";
import { currentSession, InitialSession, subscribeSession } from "../session-client";
import { createRoot, DB_VERSION } from "./seed";
import type { Database, Org, RootStore, User } from "./types";

const KEY = "alarm-root";

let seedRoot: RootStore | null = null;
const getSeedRoot = () => (seedRoot ??= createRoot());

let current: RootStore | null = null;
const listeners = new Set<() => void>();

function loadRoot(): RootStore {
  if (current) return current;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RootStore;
      if (parsed.version === DB_VERSION) return (current = parsed);
    }
  } catch {
    // Unreadable or blocked storage — fall back to the seed.
  }
  return (current = createRoot());
}

function persist(root: RootStore) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(root));
  } catch {
    // Storage full or blocked: the change still applies for this session.
  }
}

const emit = () => listeners.forEach((fn) => fn());

function subscribe(fn: () => void) {
  listeners.add(fn);
  const offSession = subscribeSession(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = null;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    offSession();
    window.removeEventListener("storage", onStorage);
  };
}

// ── Which organisation is current ───────────────────────────────────────────

/** A signed-out visitor on a meeting link works inside that meeting's organisation. */
let scopeOrg: string | null = null;

/** Set the organisation for a signed-out visitor (meeting pages). Signed-in users always use their own. */
export function setScopeOrg(orgId: string | null) {
  scopeOrg = orgId;
}

/** The current organisation's id: the session's, else the meeting scope, else none. */
export function currentOrgId(): string | null {
  const s = currentSession();
  if (s) return s.org ?? null;
  return scopeOrg;
}

/** Shown when there is no organisation (signed out, or the সুপার অ্যাডমিন): nothing in it. */
const EMPTY: Database = Object.freeze({
  version: DB_VERSION,
  admins: [],
  users: [],
  profiles: [],
  submissions: [],
  disputes: [],
  staff: [],
  assignments: [],
  reviewers: [],
  reports: [],
  aiFindings: [],
  parties: [],
  settings: createRoot().orgs[0].db.settings,
  meetings: [],
  audit: [],
}) as Database;

const orgOf = (root: RootStore, id: string | null | undefined) => (id ? root.orgs.find((o) => o.id === id) : undefined);

/** Read the current organisation's database (client only). */
export function getDb(): Database {
  if (typeof window === "undefined") return getSeedRoot().orgs[0].db;
  return orgOf(loadRoot(), currentOrgId())?.db ?? EMPTY;
}

/** Apply a change to the current organisation. `fn` receives a draft copy it may mutate freely. */
export function update(fn: (draft: Database) => void) {
  const id = currentOrgId();
  const root = loadRoot();
  const i = root.orgs.findIndex((o) => o.id === id);
  if (i < 0 || root.orgs[i].status !== "Active") return; // no organisation, or it is suspended
  const draft = structuredClone(root.orgs[i].db);
  fn(draft);
  current = { ...root, orgs: root.orgs.map((o, j) => (j === i ? { ...o, db: draft } : o)) };
  persist(current);
  emit();
}

/** Restore the current organisation's sample data (Settings → System Info, demo mode only). */
export function resetDb() {
  const id = currentOrgId();
  const root = loadRoot();
  const fresh = orgOf(createRoot(), id);
  const mine = orgOf(root, id);
  if (!mine) return;
  // The sample organisation gets its sample story back; any other one goes back to just its admin.
  const db: Database = fresh
    ? fresh.db
    : { ...mine.db, users: mine.db.users.filter((u) => u.role === "admin"), profiles: [], submissions: [], disputes: [], staff: [], assignments: [], reviewers: [], reports: [], aiFindings: [], meetings: [], audit: [] };
  current = { ...root, orgs: root.orgs.map((o) => (o.id === id ? { ...o, db } : o)) };
  persist(current);
  emit();
}

/** Subscribe a component to the current organisation's database. */
export function useDb(): Database {
  const initial = useContext(InitialSession);
  return useSyncExternalStore(subscribe, getDb, () => (initial?.org ? (orgOf(getSeedRoot(), initial.org)?.db ?? EMPTY) : initial ? EMPTY : getSeedRoot().orgs[0].db));
}

/** The current organisation's record (status, name), or undefined. */
export function useOrg(): Org | undefined {
  const initial = useContext(InitialSession);
  return useSyncExternalStore(
    subscribe,
    () => orgOf(loadRoot(), currentOrgId()),
    () => orgOf(getSeedRoot(), initial?.org),
  );
}

// ── Across organisations (sign-in, uniqueness, সুপার অ্যাডমিন) ─────────────────

export function getRoot(): RootStore {
  return typeof window === "undefined" ? getSeedRoot() : loadRoot();
}

/** The whole store — for the সুপার অ্যাডমিন portal only. */
export function useRoot(): RootStore {
  return useSyncExternalStore(subscribe, loadRoot, getSeedRoot);
}

/** Apply a change to the whole store (সুপার অ্যাডমিন actions). */
export function updateRoot(fn: (draft: RootStore) => void) {
  const draft = structuredClone(loadRoot());
  fn(draft);
  current = draft;
  persist(draft);
  emit();
}

export type AccountMatch = { kind: "super" } | { kind: "org"; org: Org; user: User } | null;

/** Who signs in with this phone, anywhere in the system. Phones are unique across organisations. */
export function findAccountByPhone(phone: string): AccountMatch {
  const root = getRoot();
  if (root.superAdmin.phone === phone) return { kind: "super" };
  for (const org of root.orgs) {
    const user = org.db.users.find((u) => u.phone === phone);
    if (user) return { kind: "org", org, user };
  }
  return null;
}

/** Every phone number in use, in every organisation (a phone can belong to only one account). */
export function allPhones(): string[] {
  const root = getRoot();
  return [root.superAdmin.phone, ...root.orgs.flatMap((o) => o.db.users.map((u) => u.phone))];
}

/** Every ALARM ID in use, in every organisation (ALARM IDs are unique system-wide). */
export function allAccountIds(): string[] {
  const root = getRoot();
  return [root.superAdmin.id, ...root.orgs.flatMap((o) => [...o.db.users.map((u) => u.id), ...o.db.admins.map((a) => a.id), ...o.db.reviewers.map((r) => r.id), ...o.db.staff.map((x) => x.id), ...o.db.profiles.map((p) => p.id)])];
}

/** The organisation a meeting link belongs to. */
export function orgIdForMeeting(code: string): string | null {
  return getRoot().orgs.find((o) => o.db.meetings.some((m) => m.code === code))?.id ?? null;
}

/** Subscribe to which organisation a meeting link belongs to. */
export function useMeetingOrgId(code: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => loadRoot().orgs.find((o) => o.db.meetings.some((m) => m.code === code))?.id ?? null,
    () => getSeedRoot().orgs.find((o) => o.db.meetings.some((m) => m.code === code))?.id ?? null,
  );
}
