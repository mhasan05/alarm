"use client";

// Client-side mock database. Persists to localStorage (per browser), syncs across tabs, and exposes a
// React hook. Server renders and first hydration use the seed, so markup always matches; the persisted
// copy takes over right after. The backend will replace this module with API calls.

import { useSyncExternalStore } from "react";
import { createSeed, DB_VERSION } from "./seed";
import type { Database } from "./types";

const KEY = "alarm-db";

let seed: Database | null = null;
const getSeed = () => (seed ??= createSeed());

let current: Database | null = null;
const listeners = new Set<() => void>();

function load(): Database {
  if (current) return current;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed.version === DB_VERSION) return (current = parsed);
    }
  } catch {
    // Unreadable or blocked storage — fall back to the seed.
  }
  return (current = createSeed());
}

function persist(db: Database) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked: the change still applies for this session.
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = null;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Read the whole database (client only). */
export function getDb(): Database {
  return typeof window === "undefined" ? getSeed() : load();
}

/** Apply a change. `fn` receives a draft copy it may mutate freely. */
export function update(fn: (draft: Database) => void) {
  const draft = structuredClone(load());
  fn(draft);
  current = draft;
  persist(draft);
  emit();
}

/** Restore the seeded sample data (Settings → System Info). */
export function resetDb() {
  current = createSeed();
  persist(current);
  emit();
}

/** Subscribe a component to the database. */
export function useDb(): Database {
  return useSyncExternalStore(subscribe, load, getSeed);
}
