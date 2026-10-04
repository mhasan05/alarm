// Labels and limits for the admin Settings screens. The values themselves live in the store
// (db.settings); this file only describes them.
import { roleOfId } from "./db/selectors";
import type { Database } from "./db/types";

/** Displayed role names (UI only, never stored). */
export type UserRole = "প্রধান নির্বাহী সম্পাদক" | "নির্বাহী সম্পাদক" | "তদন্ত সম্পাদক";

export const PERMISSION_META: { key: string; area: string; label: string; locked?: boolean }[] = [
  { key: "submit", area: "সংগ্রহ", label: "মাঠের প্রমাণ জমা দেওয়া" },
  { key: "editAfter", area: "সংগ্রহ", label: "পাঠানোর পর জমা এডিট", locked: true },
  { key: "decide", area: "যাচাই", label: "জমা গ্রহণ বা বাতিল করা" },
  { key: "editBefore", area: "যাচাই", label: "সিদ্ধান্তের আগে প্রমাণ এডিট" },
  { key: "staffNames", area: "যাচাই", label: "যিনি জমা দিয়েছেন সেই তদন্ত সম্পাদকের নাম দেখা" },
  { key: "curate", area: "প্রতিবেদন", label: "এআই-এর খুঁজে পাওয়া তথ্য রাখা বা বাদ দেওয়া" },
  { key: "sign", area: "প্রতিবেদন", label: "চূড়ান্ত প্রতিবেদন অনুমোদন দিয়ে সই" },
  { key: "share", area: "প্রতিবেদন", label: "প্রতিবেদন ডাউনলোড ও শেয়ার" },
  { key: "accounts", area: "অ্যাকাউন্ট", label: "অ্যাকাউন্ট তৈরি, বন্ধ ও পুরোপুরি বন্ধ করা", locked: true },
  { key: "disputes", area: "অ্যাকাউন্ট", label: "রাজনৈতিক কর্মীর অভিযোগের সিদ্ধান্ত" },
];

export const RULE_META = [
  { key: "sources", label: "নেতিবাচক তথ্যের জন্য আলাদা সূত্র", unit: "সূত্র", min: 1, max: 5, note: "এর কম হলে নেতিবাচক তথ্যটি এক সূত্রের তথ্য হিসেবে থাকবে, সঙ্গে একটি নোট যোগ হবে।" },
  { key: "dispute", label: "অভিযোগের উত্তর দেওয়ার সময়সীমা", unit: "কাজের দিন", min: 1, max: 14, note: "সিদ্ধান্ত পেতে সাধারণত কত দিন লাগে, তা রাজনৈতিক কর্মীদের দেখানো হয়।" },
  { key: "caseload", label: "প্রতি তদন্ত সম্পাদকের কাজের চাপের সীমা", unit: "খোলা কাজ", min: 2, max: 12, note: "সীমার একটি কম হলে তদন্ত সম্পাদককে সতর্ক করা হয়, আর সীমা ছাড়ালে নতুন কাজ দেওয়া বন্ধ থাকে।" },
  { key: "window", label: "ছবি বা ভিডিও তোলার পর আপলোডের সময়সীমা", unit: "ঘণ্টা", min: 1, max: 72, note: "এর পরে আপলোড করলে যাচাইয়ের সময় সতর্কবার্তা দেখানো হয়।" },
] as const;

export const NOTIFICATION_META: { key: string; label: string }[] = [
  { key: "dispute", label: "রাজনৈতিক কর্মী অভিযোগ জমা দিলে" },
  { key: "overdue", label: "অভিযোগ ৪৮ ঘণ্টার বেশি পুরোনো হলে" },
  { key: "held", label: "নির্বাহী সম্পাদক কোনো জমা বাতিল করলে" },
  { key: "caseload", label: "তদন্ত সম্পাদক কাজের চাপের সতর্কসীমায় পৌঁছালে" },
  { key: "report", label: "নির্বাহী সম্পাদক চূড়ান্ত প্রতিবেদন অনুমোদন করলে" },
];

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
