"use client";

// সুপার অ্যাডমিন actions: create a প্রধান নির্বাহী সম্পাদক with their own separate organisation, suspend or
// restore an organisation, and reset an admin's password. Each is recorded in the সুপার অ্যাডমিন's log.

import { newAlarmId } from "./actions";
import { nowIso } from "./format";
import { createOrgDb } from "./seed";
import { nextCode } from "./selectors";
import { allPhones, getRoot, updateRoot } from "./store";
import type { RootStore } from "./types";

const log = (r: RootStore, action: string, target: string) => r.audit.unshift({ at: nowIso(), actor: r.superAdmin.id, action, target });

export type NewOrgInput = { orgName: string; adminName: string; adminNameBn: string; phone: string; email: string; password: string };

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Create a প্রধান নির্বাহী সম্পাদক and their empty organisation. Returns the ids, or an error. */
export function createOrg(input: NewOrgInput): { ok: true; orgId: string; adminId: string } | { ok: false; error: string; field?: "phone" } {
  if (allPhones().includes(input.phone)) return { ok: false, field: "phone", error: "এই মোবাইল নম্বর অন্য একটি অ্যাকাউন্টে ব্যবহার হচ্ছে।" };
  const root = getRoot();
  const orgId = nextCode(root.orgs.map((o) => o.id), "ORG", 3);
  const adminId = newAlarmId();
  const at = nowIso();
  const admin = { id: adminId, name: input.adminName.trim() || input.adminNameBn.trim(), nameBn: input.adminNameBn.trim(), initials: initialsOf(input.adminName || input.adminNameBn), email: input.email.trim(), phone: input.phone };
  updateRoot((r) => {
    r.orgs.push({ id: orgId, name: input.orgName.trim(), adminId, status: "Active", createdAt: at, db: createOrgDb(admin, input.password, input.orgName.trim(), at) });
    log(r, "প্রতিষ্ঠান ও প্রধান নির্বাহী সম্পাদকের অ্যাকাউন্ট তৈরি করেছেন", orgId);
  });
  return { ok: true, orgId, adminId };
}

/** Suspend (closes the whole organisation for everyone in it) or restore an organisation. */
export function setOrgStatus(orgId: string, status: "Active" | "Suspended", reason = "") {
  updateRoot((r) => {
    const org = r.orgs.find((o) => o.id === orgId);
    if (!org) return;
    org.status = status;
    org.suspendedAt = status === "Suspended" ? nowIso() : undefined;
    org.suspendReason = status === "Suspended" ? reason.trim() || undefined : undefined;
    log(r, status === "Suspended" ? "প্রধান নির্বাহী সম্পাদক ও তাঁর সিস্টেম বন্ধ করেছেন" : "প্রধান নির্বাহী সম্পাদক ও তাঁর সিস্টেম আবার চালু করেছেন", orgId);
  });
}

/** Give an admin a new temporary password (shown once to the সুপার অ্যাডমিন). */
export function resetAdminPassword(orgId: string, password: string) {
  updateRoot((r) => {
    const org = r.orgs.find((o) => o.id === orgId);
    const u = org?.db.users.find((x) => x.id === org.adminId);
    if (!org || !u) return;
    u.password = password;
    log(r, "প্রধান নির্বাহী সম্পাদকের অস্থায়ী পাসওয়ার্ড দিয়েছেন", orgId);
  });
}
