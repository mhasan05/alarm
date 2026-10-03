// Field-staff roster rows derived from the store: caseload, due dates and evidence come from real records.

import { daysUntil, phoneIntl } from "@/lib/db/format";
import { openAssignments, staffSubmissions } from "@/lib/db/selectors";
import type { Database, StaffStatus } from "@/lib/db/types";

export type FieldStaff = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  district: string;
  thana: string;
  status: StaffStatus;
  /** Open assignments right now. */
  open: number;
  /** Of those, due within 48 hours (or overdue). */
  dueSoon: number;
  /** Evidence items uploaded this month. */
  evidenceMonth: number;
  joined: string;
  note?: string;
};

const monthKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit" }).format(new Date(iso));

export function staffRows(db: Database): FieldStaff[] {
  const month = monthKey(new Date().toISOString());
  return db.staff.map((s) => {
    const open = openAssignments(db, s.id);
    return {
      id: s.id,
      name: s.name,
      initials: s.initials,
      phone: phoneIntl(s.phone),
      district: s.district,
      thana: s.thana,
      status: s.status,
      open: open.length,
      dueSoon: open.filter((a) => daysUntil(a.due) <= 2).length,
      evidenceMonth: staffSubmissions(db, s.id)
        .filter((x) => monthKey(x.submittedAt) === month)
        .reduce((n, x) => n + x.evidence.length, 0),
      joined: s.joined,
      note: s.note,
    };
  });
}

export const isAvailable = (s: FieldStaff) => s.status === "On duty";

/** Open assignments at or above this are flagged; the hard limit comes from Settings. */
export const CASELOAD_WARN = 4;
