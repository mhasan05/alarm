"use client";

import { useMe } from "@/lib/auth-client";
import { disputeForSubmission, disputesFor, submissionsFor, summarize } from "@/lib/db/selectors";
import { useDb } from "@/lib/db/store";
import type { Submission } from "@/lib/db/types";

/**
 * The signed-in politician's own data. They see published reports, and their own submissions in any
 * state — never staff submissions still in review or rejected, unless they disputed one.
 */
export function usePolitician() {
  const db = useDb();
  const me = useMe();
  const profile = me?.profile;
  const all = profile ? submissionsFor(db, profile.id) : [];
  const visible = all.filter((s) => s.state === "Accepted" || s.origin === "self" || disputeForSubmission(db, s.code));
  const published = all.filter((s) => s.state === "Accepted");
  const ownOpen = all.filter((s) => s.origin === "self" && s.state !== "Accepted");
  return {
    db,
    me,
    profile,
    summary: summarize(all),
    published,
    ownOpen,
    disputes: profile ? disputesFor(db, profile.id) : [],
    /** A submission this politician may open, or undefined. */
    find: (code: string): Submission | undefined => visible.find((s) => s.code === code),
    disputeOf: (code: string) => disputeForSubmission(db, code),
  };
}
