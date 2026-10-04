// Canonical sample data for the whole system: one account per role and one connected story, so every
// portal shows the same records. A submission has one code, one author and one state everywhere.
// Times are Asia/Dhaka.
//
// The story (মিরপুর মডেল থানা, ঢাকা, ওয়ার্ড ১৩):
// • প্রধান নির্বাহী সম্পাদক রাজিব খান created the রাজনৈতিক কর্মী মোঃ রফিকুল ইসলাম's account and gave the
//   তদন্ত সম্পাদক জাহিদুল হক two field assignments (one done, one open).
// • জাহিদুল হক and রফিকুল ইসলাম submitted information; নির্বাহী সম্পাদক ফারহানা ইয়াসমিন accepted or rejected
//   each one. Three submissions are still waiting in her queue.
// • Report RPT-2026-0001 v1 was cut from the first accepted submissions and signed by ফারহানা ইয়াসমিন.
// • রফিকুল ইসলাম disputed two accepted negative findings: one decided (his response added), one still open.
// • Meetings: one ended, one upcoming for the ward, one where the তদন্ত সম্পাদক asked to join.

import { SEED_REPORTS } from "./seed-reports";
import type { Admin, AiFinding, Database, Evidence, Party, Profile, RootStore, Settings, Staff, Submission } from "./types";

export const DB_VERSION = 17;

/** Demo password for every seeded account (frontend preview only). */
export const DEMO_PASSWORD = "Alarm@2026";

const t = (date: string, time = "10:00") => `${date}T${time}:00+06:00`;
let ev = 0;
const e = (kind: string, title: string, meta: string): Evidence => ({ id: `EV-${String(++ev).padStart(4, "0")}`, kind, title, meta });

// ── Accounts ────────────────────────────────────────────────────────────────

const ADMIN = "KAR-482915"; // রাজিব খান · প্রধান নির্বাহী সম্পাদক · 01711000001
const REVIEWER = "KAR-736204"; // ফারহানা ইয়াসমিন · নির্বাহী সম্পাদক · 01711000002
const STAFF = "KAR-615283"; // জাহিদুল হক · তদন্ত সম্পাদক · 01711000003
const ACTIVIST = "KAR-814369"; // মোঃ রফিকুল ইসলাম · রাজনৈতিক কর্মী · 01711000004

const profiles: Profile[] = [
  {
    id: ACTIVIST,
    name: "মোঃ রফিকুল ইসলাম",
    initial: "র",
    post: "ওয়ার্ড কাউন্সিলর",
    party: "স্বতন্ত্র",
    seat: "ঢাকা-১৪",
    division: "ঢাকা",
    district: "ঢাকা",
    upazila: "ঢাকা উত্তর সিটি কর্পোরেশন",
    thana: "মিরপুর মডেল",
    wards: "ওয়ার্ড ১৩",
    phone: "01711000004",
    nid: "১৯৭৬••••৯০১৪",
    dob: "২০ আগস্ট ১৯৭৬",
    email: "rafiqul.islam@example.com",
    facebook: "facebook.com/rafiqul.ward13",
    office: "ওয়ার্ড ১৩ কার্যালয়, মিরপুর, ঢাকা",
    since: "২০২১",
    registeredAt: t("2026-09-10", "11:20"),
    account: "Active",
    audit: { code: "AUD-2026-0001", opened: t("2026-09-12", "10:00") },
  },
];

const staff: Staff[] = [
  {
    id: STAFF,
    name: "Jahidul Haque",
    nameBn: "জাহিদুল হক",
    initials: "JH",
    phone: "01711000003",
    email: "jahidul.haque@example.com",
    nid: "১৯৯০••••৪৩২১",
    division: "ঢাকা",
    district: "ঢাকা",
    upazila: "ঢাকা উত্তর সিটি কর্পোরেশন",
    thana: "মিরপুর মডেল",
    seat: "ঢাকা-১৪",
    wards: "ওয়ার্ড ১৩",
    status: "On duty",
    joined: t("2025-01-12"),
    completed: 1,
    device: { app: "v1.8", lastSync: "০৪ অক্টোবর, বিকেল ৪:১০", pending: 0 },
  },
];

const reviewers: Database["reviewers"] = [
  {
    id: REVIEWER,
    name: "Farhana Yasmin",
    nameBn: "ফারহানা ইয়াসমিন",
    initials: "FY",
    phone: "01711000002",
    email: "farhana.yasmin@example.com",
    nid: "১৯৮৫••••৭৭৪১",
    status: "Active",
    areas: ["ঢাকা · মিরপুর মডেল"],
    joined: t("2025-12-01"),
    // Every decision is in the records below, so there is no earlier history to add.
    history: { decided: 0, accepted: 0, avgHours: 0 },
  },
];

// ── Submissions ─────────────────────────────────────────────────────────────

type SeedSub = Omit<Submission, "events" | "evidence"> & { evidence: Evidence[] };

/** Builds the event history a seeded submission would have produced. */
function withEvents(s: SeedSub): Submission {
  const submitter = s.origin === "self" ? s.profileId : s.staffId!;
  const events: Submission["events"] = [{ at: s.submittedAt, by: submitter, type: "submitted" }];
  if (s.decidedAt && s.decidedBy) {
    const type = s.state === "Accepted" ? "accepted" : "rejected";
    events.push({ at: s.decidedAt, by: s.decidedBy, type, note: s.reason });
  }
  return { ...s, events };
}

const DEVICE = "Android · অ্যাপ v1.8 · অনলাইন";
const deviceCheck = { status: "ok" as const, label: "নিবন্ধন করা ডিভাইস থেকে জমা", detail: `${STAFF} · আগের জমাগুলোর মতো একই ডিভাইস।` };
const uniqueCheck = { status: "ok" as const, label: "কোনো ফাইল দ্বিতীয়বার জমা হয়নি", detail: "প্রতিটি ফাইলের হ্যাশ আলাদা — এই যাচাইয়ে আর কোথাও নেই।" };

const seedSubmissions: SeedSub[] = [
  // ── First assignment (ASG-01): collected 14–18 September, all decided ──
  {
    code: "SUB-0401",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "ইতিবাচক",
    title: "ওয়ার্ড ১৩-এ কমিউনিটি ক্লিনিকের সংস্কার নির্ধারিত সময়ে সম্পন্ন",
    source: "ডিএনসিসির কার্যাদেশ ও সমাপ্তি সনদ",
    body: "ওয়ার্ড ১৩-এর কমিউনিটি ক্লিনিকের সংস্কার কাজ নির্ধারিত সময়ের মধ্যে সম্পন্ন হয়েছে। ঢাকা উত্তর সিটি কর্পোরেশনের প্রকৌশল শাখা থেকে কার্যাদেশ ও সমাপ্তি সনদ সংগ্রহ করা হয়েছে এবং ক্লিনিক সরেজমিনে পরিদর্শন করা হয়েছে।",
    facts: [["প্রকল্প", "কমিউনিটি ক্লিনিক সংস্কার"], ["সমাপ্তি", "আগস্ট ২০২৬"], ["যাচাই", "মাঠ পরিদর্শন ও দাপ্তরিক নথি"]],
    evidence: [e("নথি · PDF", "কার্যাদেশ", "ডিএনসিসি প্রকৌশল শাখা"), e("নথি · PDF", "সমাপ্তি সনদ", "ডিএনসিসি, আগস্ট ২০২৬"), e("ছবি · ৩টি", "সংস্কারের পর ক্লিনিক", "মাঠ পরিদর্শনে তোলা")],
    state: "Accepted",
    submittedAt: t("2026-09-14", "12:05"),
    decidedAt: t("2026-09-15", "10:30"),
    decidedBy: REVIEWER,
    reason: "কার্যাদেশ ও সমাপ্তি সনদ — দুটি দাপ্তরিক নথিতে সমর্থিত; মাঠের ছবিতে কাজ সম্পন্ন দেখা যায়।",
    field: {
      task: "ক্লিনিক সংস্কারের নথি সংগ্রহ ও পরিদর্শন",
      visitTime: "১১:১০ – ১১:৫৫ (৪৫ মিনিট)",
      device: DEVICE,
      checks: [{ status: "ok", label: "সব ছবি সরেজমিনে দেখার সময়ের মধ্যে তোলা", detail: "তিনটি ছবিই ১১:১০ থেকে ১১:৫৫-এর মধ্যে।" }, deviceCheck, uniqueCheck],
    },
  },
  {
    code: "SUB-0402",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "ইতিবাচক",
    title: "ওয়ার্ড পরিষদের ৫২টি সভার মধ্যে ৪৭টিতে উপস্থিতি নথিভুক্ত",
    source: "ওয়ার্ড পরিষদের হাজিরা খাতার অনুলিপি (২০২৪–২০২৬)",
    body: "ওয়ার্ড ১৩ কার্যালয়ের হাজিরা খাতা অনুযায়ী ২০২৪ থেকে ২০২৬ সময়ে অনুষ্ঠিত ৫২টি সভার মধ্যে ৪৭টিতে কাউন্সিলরের উপস্থিতি নথিভুক্ত — উপস্থিতির হার ৯০.৪%। কার্যালয়ের সচিব অনুলিপিতে সিল দিয়েছেন।",
    facts: [["মোট সভা", "৫২টি"], ["উপস্থিত", "৪৭টি"], ["হার", "৯০.৪%"]],
    evidence: [e("ছবি · ৬টি", "হাজিরা খাতার পাতা", "ওয়ার্ড ১৩ কার্যালয়"), e("নথি · PDF", "সিলসহ অনুলিপি", "সচিবের স্বাক্ষর")],
    state: "Accepted",
    submittedAt: t("2026-09-14", "15:20"),
    decidedAt: t("2026-09-15", "11:05"),
    decidedBy: REVIEWER,
    reason: "সিলসহ অনুলিপি ও খাতার পাতার নম্বর ধারাবাহিক — কোনো ফাঁক নেই।",
    field: { task: "ওয়ার্ড পরিষদের হাজিরা নথি সংগ্রহ", visitTime: "১৪:৪০ – ১৫:১০ (৩০ মিনিট)", device: DEVICE, checks: [deviceCheck, uniqueCheck] },
  },
  {
    code: "SUB-0403",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "নেতিবাচক",
    title: "ড্রেনেজ দরপত্রে নিকটাত্মীয়ের মালিকানাধীন প্রতিষ্ঠান নির্বাচিত",
    source: "দরপত্র নথি ২০২৬/০৪২ ও আরজেএসসি মালিকানা রেকর্ড",
    body: "ওয়ার্ড ১৩-এর ড্রেনেজ দরপত্রে (২০২৬/০৪২) নির্বাচিত ঠিকাদারি প্রতিষ্ঠানের মালিকানায় রাজনৈতিক কর্মীর নিকটাত্মীয়ের নাম আরজেএসসি রেকর্ডে পাওয়া গেছে। দরপত্র উন্মুক্ত ছিল এবং তিনটি প্রতিষ্ঠান অংশ নিয়েছিল। বিধি লঙ্ঘনের প্রমাণ পাওয়া যায়নি, তবে মালিকানার সম্পর্কটি নথিতে নিশ্চিত।",
    facts: [["দরপত্র নম্বর", "২০২৬/০৪২"], ["অংশগ্রহণকারী", "৩টি প্রতিষ্ঠান"], ["সম্পর্ক", "নিকটাত্মীয় · আরজেএসসি নথিভুক্ত"]],
    evidence: [e("নথি · PDF", "দরপত্র মূল্যায়ন নথি ২০২৬/০৪২", "ডিএনসিসি দরপত্র শাখা"), e("নথি · PDF", "আরজেএসসি মালিকানা রেকর্ড", "সংগ্রহ ১৫ সেপ্টেম্বর ২০২৬")],
    state: "Accepted",
    submittedAt: t("2026-09-15", "13:40"),
    decidedAt: t("2026-09-16", "10:15"),
    decidedBy: REVIEWER,
    reason: "দরপত্র নথি ও আরজেএসসি রেকর্ড — দুটি স্বতন্ত্র সরকারি সূত্রে নিশ্চিত।",
    field: { task: "ড্রেনেজ দরপত্রের নথি যাচাই", device: DEVICE, checks: [deviceCheck, uniqueCheck] },
  },
  {
    code: "SUB-0404",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "নেতিবাচক",
    title: "বিদেশে অঘোষিত সম্পত্তি রয়েছে বলে অনলাইন দাবি",
    source: "বেনামি ফেসবুক পোস্ট · উৎস যাচাই করা যায়নি",
    body: "একটি বেনামি ফেসবুক পোস্টে বিদেশে অঘোষিত সম্পত্তির দাবি করা হয়েছিল। পোস্টদাতার পরিচয় যাচাই করা যায়নি এবং কোনো নথিগত ভিত্তি পাওয়া যায়নি।",
    facts: [["উৎস", "বেনামি ফেসবুক পোস্ট"], ["যাচাই", "সম্ভব হয়নি"]],
    evidence: [e("স্ক্রিনশট", "ফেসবুক পোস্টের স্ক্রিনশট", "বেনামি অ্যাকাউন্ট · লেখকের পরিচয় নেই")],
    state: "Rejected",
    submittedAt: t("2026-09-16", "09:40"),
    decidedAt: t("2026-09-16", "15:10"),
    decidedBy: REVIEWER,
    reason: "বেনামি উৎস — পোস্টদাতার পরিচয় যাচাই করা যায়নি এবং কোনো নথিগত ভিত্তি পাওয়া যায়নি।",
  },
  {
    code: "SUB-0405",
    profileId: ACTIVIST,
    origin: "self",
    category: "ইতিবাচক",
    title: "ওয়ার্ড ১৩-এ ৩৫০ মিটার নতুন পানির লাইন স্থাপন",
    source: "ঢাকা ওয়াসার কার্যাদেশ ও কাজ শেষের ছবি",
    body: "ওয়ার্ড ১৩-এর পল্লবী এলাকায় ৩৫০ মিটার নতুন পানির লাইন স্থাপন করা হয়েছে। এতে প্রায় ৬০০টি পরিবার নিয়মিত পানি পাচ্ছে। ঢাকা ওয়াসার কার্যাদেশ ও কাজ শেষের ছবি সংযুক্ত করা হয়েছে।",
    facts: [["দৈর্ঘ্য", "৩৫০ মিটার"], ["এলাকা", "পল্লবী, ওয়ার্ড ১৩"], ["উপকারভোগী", "প্রায় ৬০০ পরিবার"]],
    evidence: [e("ছবি · ৩টি", "কাজ শেষের ছবি", "রাজনৈতিক কর্মীর আপলোড"), e("নথি · PDF", "ঢাকা ওয়াসার কার্যাদেশ", "আগস্ট ২০২৬")],
    state: "Accepted",
    submittedAt: t("2026-09-17", "10:20"),
    decidedAt: t("2026-09-18", "12:00"),
    decidedBy: REVIEWER,
    reason: "ঢাকা ওয়াসার কার্যাদেশ যাচাই করা হয়েছে; ছবিতে কাজ সম্পন্ন দেখা যায়।",
  },
  {
    code: "SUB-0406",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "নেতিবাচক",
    title: "উৎসবিহীন অনুদান বিতরণের তালিকা",
    source: "অনুদান বিতরণের তালিকা · উৎস অনিশ্চিত",
    body: "অনুদান বিতরণের একটি তালিকা সংগ্রহ করা হয়েছে, তবে তালিকায় কোনো ইস্যুকারী কার্যালয়ের নাম, সিল বা তারিখ নেই। যিনি তালিকাটি দিয়েছেন তিনি পরিচয় প্রকাশে রাজি হননি।",
    facts: [["উৎস", "অজ্ঞাত"], ["সিল / তারিখ", "নেই"]],
    evidence: [e("নথি", "অনুদান বিতরণের তালিকা — উৎস অনিশ্চিত", "১৮ সেপ্টেম্বর, সকাল ৯:১২")],
    state: "Rejected",
    submittedAt: t("2026-09-18", "09:28"),
    decidedAt: t("2026-09-18", "14:55"),
    decidedBy: REVIEWER,
    reason: "নথিতে কোনো ইস্যুকারী কার্যালয় নেই এবং সরবরাহকারী অজ্ঞাত — তাই এটি সিদ্ধান্ত হিসেবে প্রমাণে যুক্ত করা যায় না।",
    field: {
      task: "অনুদান বিতরণের তালিকা সংগ্রহ",
      visitTime: "০৯:১২ – ০৯:২০ (৮ মিনিট)",
      device: DEVICE,
      checks: [
        { status: "bad", label: "কাগজে কোন অফিস দিয়েছে তা লেখা নেই", detail: "অফিসের নাম, সিল বা তারিখ নেই — কোনো সূত্রের সঙ্গে মেলানো যায় না।" },
        { status: "bad", label: "কে দিয়েছেন জানা নেই", detail: "যিনি তালিকাটি দিয়েছেন তিনি নাম জানাতে রাজি হননি, তাই প্রমাণের ধারা ভেঙে গেছে।" },
        deviceCheck,
      ],
    },
  },

  // ── Second assignment (ASG-02, open): collected from 24 September ──
  {
    code: "SUB-0407",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "নেতিবাচক",
    title: "হলফনামা ও দাখিলা রেকর্ডে ০.২৫ একরের অসঙ্গতি",
    source: "নির্বাচন কমিশনের হলফনামা ও মিরপুর ভূমি অফিসের দাখিলা রেকর্ড",
    body: "নির্বাচন কমিশনে জমা দেওয়া হলফনামার সম্পদ বিবরণীর সাথে মিরপুর ভূমি অফিসের দাখিলা রেকর্ড মিলিয়ে দেখা হয়েছে। দাগ ৪১২-তে ঘোষিত পরিমাণের চেয়ে ০.২৫ একর বেশি জমি রেকর্ডে পাওয়া গেছে। রাজনৈতিক কর্মীকে ২২ সেপ্টেম্বর লিখিতভাবে জানানো হয়েছিল; নির্ধারিত সময়ে জবাব পাওয়া যায়নি।",
    facts: [["অসঙ্গতি", "০.২৫ একর"], ["দাগ", "৪১২"], ["জবাব চাওয়া", "২২ সেপ্টেম্বর ২০২৬"]],
    evidence: [e("নথি · PDF", "নির্বাচন কমিশনের হলফনামা", "জমা ২০২১"), e("নথি · ছবি", "ভূমি অফিসের দাখিলা রেকর্ড", "মিরপুর, সংগ্রহ ২৪ সেপ্টেম্বর"), e("নথি · PDF", "জবাব চেয়ে পাঠানো চিঠি", "২২ সেপ্টেম্বর")],
    state: "Accepted",
    submittedAt: t("2026-09-24", "13:30"),
    decidedAt: t("2026-09-25", "11:40"),
    decidedBy: REVIEWER,
    reason: "দুটি সরকারি নথিতে অসঙ্গতি সমর্থিত। ব্যক্তিকে জবাবের সুযোগ দেওয়া হয়েছিল; নির্ধারিত সময়ে জবাব আসেনি।",
    field: { task: "হলফনামা ও দাখিলা রেকর্ড মিলিয়ে দেখা", device: DEVICE, checks: [deviceCheck, uniqueCheck] },
  },
  {
    code: "SUB-0408",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "ইতিবাচক",
    title: "ওয়ার্ডে ২টি সড়ক সংস্কার নির্ধারিত বাজেটের মধ্যে সম্পন্ন",
    source: "ডিএনসিসির প্রকল্প সমাপ্তি প্রতিবেদন ও মাঠের ছবি",
    body: "ওয়ার্ড ১৩-এর দুটি সড়ক সংস্কার প্রকল্প সরেজমিনে পরিদর্শন করা হয়েছে। বরাদ্দ ছিল ৬২ লক্ষ টাকা; সমাপ্তি প্রতিবেদনে ব্যয় দেখানো হয়েছে ৫৯ লক্ষ ৪০ হাজার টাকা। প্রকল্প সাইনবোর্ড ও সমাপ্ত সড়কের ছবি সংযুক্ত।",
    facts: [["প্রকল্প", "দুটি সড়ক সংস্কার"], ["বরাদ্দ", "৬২,০০,০০০ টাকা"], ["ব্যয়", "৫৯,৪০,০০০ টাকা"]],
    evidence: [e("ছবি · ৫টি", "সমাপ্ত সড়ক ও সাইনবোর্ড", "মাঠ পরিদর্শনে তোলা"), e("নথি · PDF", "প্রকল্প সমাপ্তি প্রতিবেদন", "ডিএনসিসি প্রকৌশল শাখা")],
    state: "Accepted",
    submittedAt: t("2026-09-26", "11:15"),
    decidedAt: t("2026-09-27", "10:20"),
    decidedBy: REVIEWER,
    reason: "প্রকল্প সমাপ্তি প্রতিবেদন ও মাঠের ছবিতে তথ্যটি সমর্থিত।",
    field: { task: "সড়ক সংস্কার প্রকল্প পরিদর্শন", visitTime: "১০:২০ – ১১:০৫ (৪৫ মিনিট)", device: DEVICE, checks: [deviceCheck, uniqueCheck] },
  },

  // ── Waiting in the নির্বাহী সম্পাদক's queue ──
  {
    code: "SUB-0409",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "নেতিবাচক",
    title: "জলাশয় ভরাটের অনুমোদন প্রক্রিয়ায় সুপারিশকারী হিসেবে সম্পৃক্ততা",
    source: "পরিবেশ অধিদপ্তরের আদেশ ও মাঠের ছবি",
    body: "ওয়ার্ড ১৩-এ জলাশয় ভরাট করে নির্মিত একটি স্থাপনার অনুমোদন প্রক্রিয়ায় সুপারিশকারী হিসেবে রাজনৈতিক কর্মীর স্বাক্ষর পাওয়া গেছে। পরিবেশ অধিদপ্তর ২০২৫ সালের জুলাইয়ে স্থাপনাটিকে অবৈধ ঘোষণা করে।",
    facts: [["আদেশ", "পরিবেশ অধিদপ্তর, ২২ জুলাই ২০২৫"], ["ভূমিকা", "সুপারিশকারী"]],
    evidence: [e("নথি · PDF", "পরিবেশ অধিদপ্তরের আদেশ", "২২ জুলাই ২০২৫"), e("ছবি · ২টি", "স্থাপনা ও ভরাটকৃত জলাশয়", "মাঠ পরিদর্শনে তোলা")],
    state: "Pending",
    submittedAt: t("2026-10-03", "11:40"),
    field: { task: "জলাশয় ভরাট বিষয়ে নথি সংগ্রহ", visitTime: "১০:৫০ – ১১:২৫ (৩৫ মিনিট)", device: DEVICE, checks: [deviceCheck, uniqueCheck] },
  },
  {
    code: "SUB-0410",
    profileId: ACTIVIST,
    origin: "staff",
    staffId: STAFF,
    category: "ইতিবাচক",
    title: "ওয়ার্ডের দুটি প্রাথমিক বিদ্যালয়ে নতুন স্যানিটেশন ব্লক",
    source: "শিক্ষা প্রকৌশল অধিদপ্তরের হস্তান্তর পত্র ও মাঠের ছবি",
    body: "ওয়ার্ড ১৩-এর দুটি সরকারি প্রাথমিক বিদ্যালয়ে ছাত্র ও ছাত্রীদের জন্য আলাদা স্যানিটেশন ব্লক নির্মাণ শেষে হস্তান্তর করা হয়েছে। প্রধান শিক্ষকদের সাথে কথা বলে ব্যবহার শুরুর তথ্য নিশ্চিত করা হয়েছে।",
    facts: [["বিদ্যালয়", "২টি"], ["হস্তান্তর", "সেপ্টেম্বর ২০২৬"]],
    evidence: [e("নথি · PDF", "হস্তান্তর পত্র", "শিক্ষা প্রকৌশল অধিদপ্তর"), e("ছবি · ৪টি", "স্যানিটেশন ব্লক", "মাঠ পরিদর্শনে তোলা")],
    state: "Pending",
    submittedAt: t("2026-10-04", "16:10"),
    field: { task: "বিদ্যালয়ের স্যানিটেশন প্রকল্প পরিদর্শন", visitTime: "১৫:১০ – ১৫:৫৫ (৪৫ মিনিট)", device: DEVICE, checks: [deviceCheck, uniqueCheck] },
  },
  {
    code: "SUB-0411",
    profileId: ACTIVIST,
    origin: "self",
    category: "ইতিবাচক",
    title: "ওয়ার্ড ১৩-এ ৫০০টি গাছের চারা রোপণ কর্মসূচি",
    source: "কর্মসূচির ছবি ও বন বিভাগের চারা বরাদ্দপত্র",
    body: "বর্ষা মৌসুমে ওয়ার্ড ১৩-এর সড়কের পাশে ও বিদ্যালয় প্রাঙ্গণে ৫০০টি গাছের চারা রোপণ করা হয়েছে। বন বিভাগ থেকে চারা বরাদ্দ পাওয়া গেছে; স্থানীয় স্বেচ্ছাসেবকরা অংশ নিয়েছেন।",
    facts: [["চারা", "৫০০টি"], ["সময়", "সেপ্টেম্বর ২০২৬"]],
    evidence: [e("ছবি · ৪টি", "রোপণ কর্মসূচির ছবি", "রাজনৈতিক কর্মীর আপলোড"), e("নথি · PDF", "চারা বরাদ্দপত্র", "বন বিভাগ, ঢাকা")],
    state: "Pending",
    submittedAt: t("2026-10-04", "19:30"),
  },
];

const submissions: Submission[] = seedSubmissions.map(withEvents);

// ── AI findings (public records found by the analysis) ──────────────────────

const aiFindings: AiFinding[] = [
  { id: "AI-01", profileId: ACTIVIST, category: "ইতিবাচক", title: "নির্বাচন কমিশনে জমা হলফনামায় কোনো ফৌজদারি মামলার তথ্য নেই", meta: "নির্বাচন কমিশনের হলফনামা · এআই কর্তৃক প্রাপ্ত", sources: 1, suggested: "keep" },
  { id: "AI-02", profileId: ACTIVIST, category: "ইতিবাচক", title: "গত পাঁচ বছরের আয়কর রিটার্ন নিয়মিত দাখিল করা হয়েছে", meta: "এনবিআর কর রিটার্ন সারসংক্ষেপ · এআই কর্তৃক প্রাপ্ত", sources: 1, suggested: "keep" },
  { id: "AI-03", profileId: ACTIVIST, category: "নেতিবাচক", title: "২০২৫ সালের একটি রাজনৈতিক সংঘর্ষে সম্পৃক্ততার অভিযোগে সংবাদ প্রতিবেদন", meta: "একটি অনলাইন সংবাদমাধ্যম, মার্চ ২০২৫ · অভিযোগ, আদালতের কোনো নথি নেই", sources: 1, suggested: "exclude" },
];

// ── Defaults shared by every organisation ───────────────────────────────────

const DEFAULT_PARTIES: Party[] = [
  { name: "বাংলাদেশ আওয়ামী লীগ", kind: "Party" },
  { name: "বাংলাদেশ জাতীয়তাবাদী দল (বিএনপি)", kind: "Party" },
  { name: "জাতীয় পার্টি", kind: "Party" },
  { name: "বাংলাদেশ জামায়াতে ইসলামী", kind: "Party" },
  { name: "জাতীয় নাগরিক পার্টি (এনসিপি)", kind: "Party" },
  { name: "বাংলাদেশ খেলাফত মজলিস", kind: "Party" },
  { name: "স্বতন্ত্র", kind: "Party" },
  { name: "জাতীয় শ্রমিক লীগ", kind: "Organisation" },
  { name: "সুশাসনের জন্য নাগরিক (সুজন)", kind: "Organisation" },
  { name: "প্রধান নির্বাহী সম্পাদক কর্তৃক শুরু", kind: "Organisation" },
];

function defaultSettings(org: string): Settings {
  return {
    org,
    language: "bn",
    timezone: "Asia/Dhaka",
    footer: `${org} কর্তৃক প্রস্তুত। অননুমোদিত বিতরণ লগে সংরক্ষিত হয়।`,
    rules: { sources: 2, dispute: 3, caseload: 6, window: 24 },
    notifications: {
      dispute: { sms: true, email: true },
      overdue: { sms: true, email: false },
      held: { sms: false, email: true },
      caseload: { sms: false, email: true },
      report: { sms: false, email: true },
    },
    permissions: {
      submit: { admin: true, reviewer: false, staff: true },
      editAfter: { admin: true, reviewer: false, staff: false },
      decide: { admin: true, reviewer: true, staff: false },
      editBefore: { admin: true, reviewer: true, staff: false },
      staffNames: { admin: true, reviewer: false, staff: false },
      curate: { admin: true, reviewer: false, staff: false },
      sign: { admin: false, reviewer: true, staff: false },
      share: { admin: true, reviewer: true, staff: false },
      accounts: { admin: true, reviewer: false, staff: false },
      disputes: { admin: true, reviewer: true, staff: false },
    },
    security: { twoFactor: true, timeout: 30 },
  };
}

// ── Database ────────────────────────────────────────────────────────────────

export function createSeed(): Database {
  return {
    version: DB_VERSION,
    admins: [{ id: ADMIN, name: "Razib Khan", nameBn: "রাজিব খান", initials: "RK", email: "razib.khan@example.com", phone: "01711000001" }],
    // Every account's id is its ALARM ID (KAR- + 6 digits) — the one identifier people use everywhere.
    users: [
      { id: ADMIN, role: "admin", phone: "01711000001", password: DEMO_PASSWORD, subjectId: ADMIN },
      { id: REVIEWER, role: "reviewer", phone: "01711000002", password: DEMO_PASSWORD, subjectId: REVIEWER },
      { id: STAFF, role: "staff", phone: "01711000003", password: DEMO_PASSWORD, subjectId: STAFF },
      { id: ACTIVIST, role: "politician", phone: "01711000004", password: DEMO_PASSWORD, subjectId: ACTIVIST },
    ],
    profiles,
    submissions,
    disputes: [
      {
        code: "DSP-001",
        submissionCode: "SUB-0403",
        profileId: ACTIVIST,
        reason: "পুরো ঘটনা বলা হয়নি",
        claim: "দরপত্রটি উন্মুক্ত প্রক্রিয়ায় হয়েছে এবং আমি মূল্যায়ন কমিটিতে ছিলাম না — কমিটির কার্যবিবরণী সংযুক্ত করেছি।",
        attachments: ["মূল্যায়ন কমিটির কার্যবিবরণী"],
        filedAt: t("2026-09-21", "10:30"),
        state: "Kept",
        decidedAt: t("2026-09-22", "12:02"),
        decidedBy: ADMIN,
        decisionReason: "কার্যবিবরণী অনুযায়ী তিনি মূল্যায়ন কমিটিতে ছিলেন না, তবে মালিকানার সম্পর্ক দুটি সরকারি কাগজে নিশ্চিত — তাই তথ্যটি ঠিক আছে।",
      },
      {
        code: "DSP-002",
        submissionCode: "SUB-0407",
        profileId: ACTIVIST,
        reason: "তথ্য ভুল",
        claim: "দাগ ৪১২-এর ০.২৫ একর ২০২২ সালে ওয়ারিশসূত্রে আমার ভাইয়ের নামে হস্তান্তরিত হয়েছে। হস্তান্তরের দলিল ও নামজারির কাগজ সংযুক্ত করেছি।",
        attachments: ["হস্তান্তর দলিল ৪৪৫২/২২", "নামজারি খতিয়ান"],
        filedAt: t("2026-10-02", "10:08"),
        state: "Open",
      },
    ],
    staff,
    assignments: [
      {
        id: "ASG-01",
        staffId: STAFF,
        profileId: ACTIVIST,
        brief: "ওয়ার্ড ১৩-এর উন্নয়ন প্রকল্প, ওয়ার্ড পরিষদের হাজিরা ও দরপত্রের নথি সংগ্রহ করুন।",
        wards: "ওয়ার্ড ১৩, মিরপুর মডেল",
        due: "2026-09-20",
        open: false,
      },
      {
        id: "ASG-02",
        staffId: STAFF,
        profileId: ACTIVIST,
        brief: "হলফনামায় ঘোষিত সম্পদের সাথে ভূমি অফিসের দাখিলা রেকর্ড মিলিয়ে দেখুন। জলাশয় ভরাট ও বিদ্যালয়ের প্রকল্পের নথি সংগ্রহ করুন।",
        wards: "ওয়ার্ড ১৩, মিরপুর মডেল",
        due: "2026-10-10",
        open: true,
      },
    ],
    reviewers,
    reports: SEED_REPORTS,
    aiFindings,
    parties: DEFAULT_PARTIES.map((p) => ({ ...p })),
    settings: defaultSettings("ALARM Bangladesh"),
    meetings: [
      {
        id: "MTG-003",
        code: "rk7m-2pqz-h4wd",
        title: "ওয়ার্ড ১৩ মাঠ পর্যালোচনা সভা",
        agenda: "১. সেপ্টেম্বরের জমা ও সিদ্ধান্তের সারসংক্ষেপ\n২. সারিতে থাকা তিনটি জমা ও খোলা অভিযোগ\n৩. অক্টোবরের মাঠের কাজের পরিকল্পনা",
        scheduledAt: t("2026-10-08", "11:00"),
        createdBy: ADMIN,
        createdAt: t("2026-10-01", "16:10"),
        status: "scheduled",
        // ঢাকা → মিরপুর মডেল → ওয়ার্ড ১৩: all three team members and the রাজনৈতিক কর্মী are inside.
        area: { division: "ঢাকা", district: "ঢাকা", upazila: "ঢাকা উত্তর সিটি কর্পোরেশন", thana: "মিরপুর মডেল", ward: "ওয়ার্ড ১৩" },
        invitees: [],
        requests: [],
        presence: [],
        attended: [],
        removed: [],
      },
      {
        id: "MTG-002",
        code: "w3nb-8ycu-t6ka",
        title: "চট্টগ্রাম বিভাগে কার্যক্রম শুরুর প্রস্তুতি সভা",
        agenda: "চট্টগ্রাম বিভাগে কার্যক্রম শুরু, নতুন নির্বাহী সম্পাদকদের প্রশিক্ষণ ও দায়িত্বের এলাকা বণ্টন।",
        scheduledAt: t("2026-10-14", "15:30"),
        createdBy: ADMIN,
        createdAt: t("2026-10-02", "12:00"),
        status: "scheduled",
        // Outside ঢাকা: the নির্বাহী সম্পাদক is invited by name; the তদন্ত সম্পাদক asked to join.
        area: { division: "চট্টগ্রাম", district: "", upazila: "", thana: "", ward: "" },
        invitees: [REVIEWER],
        requests: [{ userId: STAFF, at: t("2026-10-03", "09:40"), note: "মিরপুরে মাঠের কাজের অভিজ্ঞতা জানাতে চাই।", state: "pending" }],
        presence: [],
        attended: [],
        removed: [],
      },
      {
        id: "MTG-001",
        code: "f9xd-4gem-q2vr",
        title: "সেপ্টেম্বরের কাজের সমন্বয় সভা",
        agenda: "পর্যালোচনার মানদণ্ড, ৪৮ ঘণ্টার মধ্যে সিদ্ধান্ত দেওয়ার নিয়ম ও মাঠের কাজের অগ্রগতি।",
        scheduledAt: t("2026-09-29", "10:00"),
        createdBy: ADMIN,
        createdAt: t("2026-09-25", "14:20"),
        status: "ended",
        startedAt: t("2026-09-29", "10:02"),
        endedAt: t("2026-09-29", "10:41"),
        area: { division: "ঢাকা", district: "ঢাকা", upazila: "", thana: "", ward: "" },
        invitees: [],
        requests: [],
        presence: [],
        attended: [ADMIN, REVIEWER, STAFF],
        removed: [],
      },
    ],
    // Newest first, matching every record above.
    audit: [
      { at: t("2026-10-04", "19:30"), actor: ACTIVIST, action: "নিজের কাজ যোগ করেছেন", target: "SUB-0411" },
      { at: t("2026-10-04", "16:10"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0410" },
      { at: t("2026-10-03", "11:40"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0409" },
      { at: t("2026-10-03", "09:40"), actor: STAFF, action: "মিটিংয়ে যোগ দেওয়ার অনুরোধ করেছেন", target: "MTG-002" },
      { at: t("2026-10-02", "12:00"), actor: ADMIN, action: "মিটিং তৈরি করেছেন", target: "MTG-002" },
      { at: t("2026-10-02", "10:08"), actor: ACTIVIST, action: "অভিযোগ জমা দিয়েছেন", target: "DSP-002" },
      { at: t("2026-10-01", "16:10"), actor: ADMIN, action: "মিটিং তৈরি করেছেন", target: "MTG-003" },
      { at: t("2026-09-29", "10:41"), actor: ADMIN, action: "মিটিং শেষ করেছেন", target: "MTG-001" },
      { at: t("2026-09-29", "10:02"), actor: ADMIN, action: "মিটিং শুরু করেছেন", target: "MTG-001" },
      { at: t("2026-09-27", "10:20"), actor: REVIEWER, action: "জমা গ্রহণ করেছেন", target: "SUB-0408" },
      { at: t("2026-09-26", "11:15"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0408" },
      { at: t("2026-09-25", "14:20"), actor: ADMIN, action: "মিটিং তৈরি করেছেন", target: "MTG-001" },
      { at: t("2026-09-25", "11:40"), actor: REVIEWER, action: "জমা গ্রহণ করেছেন", target: "SUB-0407" },
      { at: t("2026-09-24", "13:30"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0407" },
      { at: t("2026-09-22", "12:02"), actor: ADMIN, action: "অভিযোগ বাতিল করেছেন — তথ্য ঠিক আছে", target: "DSP-001" },
      { at: t("2026-09-21", "10:30"), actor: ACTIVIST, action: "অভিযোগ জমা দিয়েছেন", target: "DSP-001" },
      { at: t("2026-09-21", "09:00"), actor: ADMIN, action: "তদন্ত সম্পাদককে মাঠের কাজ দিয়েছেন", target: `${STAFF} → ${ACTIVIST}` },
      { at: t("2026-09-20", "11:30"), actor: REVIEWER, action: "প্রতিবেদন অনুমোদন দিয়ে সই করেছেন", target: "RPT-2026-0001" },
      { at: t("2026-09-19", "16:20"), actor: ADMIN, action: "প্রতিবেদন তৈরি করেছেন", target: "RPT-2026-0001" },
      { at: t("2026-09-18", "14:55"), actor: REVIEWER, action: "জমা বাতিল করেছেন", target: "SUB-0406" },
      { at: t("2026-09-18", "12:00"), actor: REVIEWER, action: "জমা গ্রহণ করেছেন", target: "SUB-0405" },
      { at: t("2026-09-18", "09:28"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0406" },
      { at: t("2026-09-17", "10:20"), actor: ACTIVIST, action: "নিজের কাজ যোগ করেছেন", target: "SUB-0405" },
      { at: t("2026-09-16", "15:10"), actor: REVIEWER, action: "জমা বাতিল করেছেন", target: "SUB-0404" },
      { at: t("2026-09-16", "10:15"), actor: REVIEWER, action: "জমা গ্রহণ করেছেন", target: "SUB-0403" },
      { at: t("2026-09-16", "09:40"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0404" },
      { at: t("2026-09-15", "13:40"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0403" },
      { at: t("2026-09-15", "11:05"), actor: REVIEWER, action: "জমা গ্রহণ করেছেন", target: "SUB-0402" },
      { at: t("2026-09-15", "10:30"), actor: REVIEWER, action: "জমা গ্রহণ করেছেন", target: "SUB-0401" },
      { at: t("2026-09-14", "15:20"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0402" },
      { at: t("2026-09-14", "12:05"), actor: STAFF, action: "তথ্য জমা দিয়েছেন", target: "SUB-0401" },
      { at: t("2026-09-12", "10:05"), actor: ADMIN, action: "তদন্ত সম্পাদককে মাঠের কাজ দিয়েছেন", target: `${STAFF} → ${ACTIVIST}` },
      { at: t("2026-09-10", "11:20"), actor: ADMIN, action: "রাজনৈতিক কর্মীর অ্যাকাউন্ট তৈরি করেছেন", target: ACTIVIST },
      { at: t("2026-09-05", "15:00"), actor: ADMIN, action: "নির্বাহী সম্পাদকের দায়িত্বের এলাকা ঠিক করে দিয়েছেন", target: REVIEWER },
    ],
  };
}

/** A brand-new organisation: only its প্রধান নির্বাহী সম্পাদক, no other accounts or records yet. */
export function createOrgDb(admin: Admin, password: string, orgName: string, at: string): Database {
  return {
    version: DB_VERSION,
    admins: [admin],
    users: [{ id: admin.id, role: "admin", phone: admin.phone, password, subjectId: admin.id }],
    profiles: [],
    submissions: [],
    disputes: [],
    staff: [],
    assignments: [],
    reviewers: [],
    reports: [],
    aiFindings: [],
    parties: DEFAULT_PARTIES.map((p) => ({ ...p })),
    settings: defaultSettings(orgName),
    meetings: [],
    // Recorded as "system": the সুপার অ্যাডমিন is outside the organisation and is not named inside it.
    audit: [{ at, actor: "system", action: "প্রতিষ্ঠান ও প্রধান নির্বাহী সম্পাদকের অ্যাকাউন্ট তৈরি করেছেন", target: admin.id }],
  };
}

/** The সুপার অ্যাডমিন's sign-in (01711000000). */
export const SUPER_ADMIN_ID = "KAR-571093";

/** Everything stored: the সুপার অ্যাডমিন and one organisation holding the sample story. */
export function createRoot(): RootStore {
  return {
    version: DB_VERSION,
    superAdmin: { id: SUPER_ADMIN_ID, name: "আরিফুর রহমান", phone: "01711000000", email: "superadmin@example.com", password: DEMO_PASSWORD },
    orgs: [{ id: "ORG-001", name: "ALARM Bangladesh", adminId: ADMIN, status: "Active", createdAt: t("2026-09-01", "10:00"), db: createSeed() }],
    audit: [{ at: t("2026-09-01", "10:00"), actor: SUPER_ADMIN_ID, action: "প্রতিষ্ঠান ও প্রধান নির্বাহী সম্পাদকের অ্যাকাউন্ট তৈরি করেছেন", target: "ORG-001" }],
  };
}
