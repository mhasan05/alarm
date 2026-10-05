// Labels and limits for the admin Settings screens. The values themselves live in the store
// (db.settings); this file only describes them.
import { roleOfId } from "./db/selectors";
import type { Database } from "./db/types";

/** Displayed role names (UI only, never stored). */
export type UserRole = "প্রধান নির্বাহী সম্পাদক" | "নির্বাহী সম্পাদক" | "তদন্ত সম্পাদক";

/** Where an audit-log target opens, when it has a page. */
export function auditHref(target: string, db?: Database): string | null {
  const code = target.split(" ")[0];
  if (/^DSP-/.test(code)) return `/admin/disputes/${code}`;
  if (/^RPT-/.test(code)) return `/admin/reports/${code}`;
  if (/^KAR-\d{6}$/.test(code)) {
    const role = db ? roleOfId(db, code) : "politician";
    return role === "staff" ? `/admin/field-staff/${code}` : role === "reviewer" ? `/admin/reviewers/${code}` : role === "politician" ? `/admin/politicians/${code}` : null;
  }
  if (/^SUB-/.test(code)) return `/admin/submissions/${code}`;
  return null;
}
