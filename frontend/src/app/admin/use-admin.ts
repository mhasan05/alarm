"use client";

import { useMe } from "@/lib/auth-client";
import { useDb } from "@/lib/db/store";

/** The signed-in admin and the full database (admins see everything). */
export function useAdmin() {
  const db = useDb();
  const me = useMe();
  const admin = me?.admin ?? db.admins[0];
  return { db, me, admin, adminId: admin?.id ?? "" };
}
