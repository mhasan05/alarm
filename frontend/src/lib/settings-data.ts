// Labels and limits for the admin Settings screens. The values themselves live in the store
// (db.settings); this file only describes them.

export type UserRole = "Admin" | "Reviewer" | "Field Staff";

export const PERMISSION_META: { key: string; area: string; label: string; locked?: boolean }[] = [
  { key: "submit", area: "Collection", label: "Submit field evidence" },
  { key: "editAfter", area: "Collection", label: "Edit a submission after sending", locked: true },
  { key: "decide", area: "Review", label: "Accept, hold or reject submissions" },
  { key: "editBefore", area: "Review", label: "Edit evidence before deciding" },
  { key: "staffNames", area: "Review", label: "See submitting staff names" },
  { key: "curate", area: "Reports", label: "Keep or exclude AI findings" },
  { key: "sign", area: "Reports", label: "Approve and sign final reports" },
  { key: "share", area: "Reports", label: "Download and share reports" },
  { key: "accounts", area: "Accounts", label: "Create, suspend and deactivate accounts", locked: true },
  { key: "disputes", area: "Accounts", label: "Decide political activist disputes" },
];

export const RULE_META = [
  { key: "sources", label: "Independent sources for a negative finding", unit: "sources", min: 1, max: 5, note: "Below this, a negative finding stays single-source and carries a note." },
  { key: "dispute", label: "Dispute response window", unit: "working days", min: 1, max: 14, note: "Shown to political activists as the usual decision time." },
  { key: "caseload", label: "Caseload limit per field staff", unit: "open", min: 2, max: 12, note: "Staff are flagged one below the limit and blocked above it." },
  { key: "window", label: "Upload window after capture", unit: "hours", min: 1, max: 72, note: "Later uploads get an integrity warning." },
] as const;

export const NOTIFICATION_META: { key: string; label: string }[] = [
  { key: "dispute", label: "Political activist files a dispute" },
  { key: "overdue", label: "Dispute older than 48 hours" },
  { key: "held", label: "Reviewer holds a submission — source unclear" },
  { key: "caseload", label: "Field staff reaches the caseload warning" },
  { key: "report", label: "Final report approved by the reviewer" },
];

/** Where an audit-log target opens, when it has a page. */
export function auditHref(target: string): string | null {
  const code = target.split(" ")[0];
  if (/^DSP-/.test(code)) return "/admin/disputes?tab=all";
  if (/^RPT-/.test(code)) return `/admin/reports/${code}`;
  if (/^FS-/.test(code)) return `/admin/field-staff/${code}`;
  if (/^REV-/.test(code)) return `/admin/reviewers/${code}`;
  if (/^PRF-/.test(code)) return `/admin/politicians/${code}`;
  if (/^SUB-/.test(code)) return `/admin/field-reports/${code}`;
  return null;
}
