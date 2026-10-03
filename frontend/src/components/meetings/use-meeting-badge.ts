"use client";

import { useMe } from "@/lib/auth-client";
import { bn } from "@/lib/db/format";
import { accessOf, canEnter, meetingsFor, pendingRequests } from "@/lib/db/meetings";
import { useDb } from "@/lib/db/store";

/**
 * Nav badge for "মিটিং": for the admin, join requests waiting on open meetings; for everyone else,
 * meetings running now that they may enter.
 */
export function useMeetingBadge(): string | undefined {
  const db = useDb();
  const me = useMe();
  if (!me) return undefined;
  const n =
    me.role === "admin"
      ? db.meetings.filter((m) => m.status === "live" || m.status === "scheduled").reduce((s, m) => s + pendingRequests(m).length, 0)
      : meetingsFor(db, me.userId).filter((m) => m.status === "live" && canEnter(accessOf(db, m, me.userId, me.role))).length;
  return n ? bn(n) : undefined;
}
