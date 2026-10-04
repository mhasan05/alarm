"use client";

import Link from "next/link";
import { useState } from "react";
import { StatTiles } from "@/components/charts";
import { RecordMissing } from "@/components/record-missing";
import { EvidenceDropzone, EvidenceList, filesToEvidence, useEvidenceFiles } from "@/components/evidence";
import { inputClass, Required } from "@/components/form";
import { RichTextEditor } from "@/components/rich-text";
import { decide as recordDecision, submit, undoDecision } from "@/lib/db/actions";
import { bn, bnDate, nowIso, phoneBn } from "@/lib/db/format";
import {
  activeReviewersFor,
  analysisStatus,
  CATEGORY_STYLE,
  disputeForSubmission,
  nameOf,
  profileOf,
  reportsForProfile,
  STATE_CHIP,
  submissionsFor,
  summarize,
} from "@/lib/db/selectors";
import type { Category, SubmissionState } from "@/lib/db/types";
import { plainText } from "@/lib/rich-text";
import { useAdmin } from "../../use-admin";

type State = SubmissionState;
type Filter = "All" | Category | "Pending" | "Rejected";

const FILTER_LABEL: Record<Filter, string> = { All: "সব", ইতিবাচক: "ইতিবাচক", নেতিবাচক: "নেতিবাচক", Pending: "যাচাই চলছে", Rejected: "বাতিল" };
/** Profile `account` values are stored in English; show them in Bengali. */
const ACCOUNT_BN: Record<string, string> = { Active: "চালু আছে", Suspended: "বন্ধ", Deactivated: "পুরোপুরি বন্ধ" };
const BN_MONTH: Record<string, string> = {
  Jan: "জানুয়ারি", Feb: "ফেব্রুয়ারি", Mar: "মার্চ", Apr: "এপ্রিল", May: "মে", Jun: "জুন",
  Jul: "জুলাই", Aug: "আগস্ট", Sep: "সেপ্টেম্বর", Oct: "অক্টোবর", Nov: "নভেম্বর", Dec: "ডিসেম্বর",
};
/** Report version dates are stored as "16 Sep 2026"; show them as "১৬ সেপ্টেম্বর ২০২৬". */
const bnVersionDate = (d: string) => bn(d.replace(/\b([A-Z][a-z]{2})[a-z]*\b/g, (m, mon: string) => BN_MONTH[mon] ?? m));

const STATE_DOT: Record<State, string> = { Accepted: "bg-success", Pending: "bg-warning", Rejected: "bg-danger" };

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Admin's internal view of one politician. Score and stats follow the report states, which the
 * admin can decide directly (with undo); new reports added here go to the reviewer as Pending.
 */
export function SubjectView({ profileId, initialAdding = false }: { profileId: string; initialAdding?: boolean }) {
  const { db, adminId } = useAdmin();
  // Decisions made in this visit, so they can be undone here.
  const [decidedHere, setDecidedHere] = useState<string[]>([]);
  const [deciding, setDeciding] = useState<{ code: string; to: "Accepted" | "Rejected" } | null>(null);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [adding, setAdding] = useState(initialAdding);

  const p = profileOf(db, profileId);
  if (!p) return <RecordMissing title="প্রোফাইলটি পাওয়া যায়নি" backHref="/admin/politicians" backLabel="রাজনৈতিক কর্মী তালিকায় ফিরুন" />;

  const profile = { ...p, phone: phoneBn(p.phone), area: `${p.seat}, ${p.thana}` };
  const subs = submissionsFor(db, profileId);
  const sm = summarize(subs);
  const all = subs.map((r) => ({ ...r, cur: r.state }));
  const acc = all.filter((r) => r.cur === "Accepted");
  const pos = sm.positive;
  const neg = sm.negative;
  const hasReports = all.length > 0;
  const score = sm.score;
  const band = !acc.length
    ? { label: "এখনও কোনো জমা গ্রহণ হয়নি", color: "#4A7060" }
    : score >= 67
      ? { label: "বেশিরভাগ ইতিবাচক রেকর্ড", color: "#1A7A4A" }
      : score >= 34
        ? { label: "মিশ্র রেকর্ড", color: "#D97706" }
        : { label: "বেশিরভাগ নেতিবাচক রেকর্ড", color: "#F42A41" };
  const analysis = analysisStatus(db, profileId);
  const staffCount = new Set(subs.map((s) => s.staffId).filter(Boolean)).size;
  const reviewer = activeReviewersFor(db, profileId)[0];
  const versions = reportsForProfile(db, profileId)[0]?.versions ?? [];
  const auditState = analysis.pending ? "অডিট চলছে" : analysis.ready ? "বিশ্লেষণের জন্য তৈরি" : versions.length ? "প্রতিবেদন প্রকাশ হয়েছে" : "তথ্য সংগ্রহ চলছে";
  const facts = { nid: p.nid, audit: p.audit.code, opened: bnDate(p.audit.opened), staff: `${bn(staffCount)} জন`, wards: p.wards, auditState };

  const counts: Record<Filter, number> = {
    All: all.length,
    ইতিবাচক: all.filter((r) => r.category === "ইতিবাচক").length,
    নেতিবাচক: all.filter((r) => r.category === "নেতিবাচক").length,
    Pending: all.filter((r) => r.cur === "Pending").length,
    Rejected: all.filter((r) => r.cur === "Rejected").length,
  };
  const shown = all.filter((r) => filter === "All" || r.category === filter || r.cur === filter);

  const stats = [
    { label: "মোট জমা", value: bn(all.length), color: "#0D1F17", note: "এই প্রোফাইলের সব জমা" },
    { label: "গ্রহণ হয়েছে", value: bn(acc.length), color: "#1A7A4A", note: "স্কোরে ধরা হয়" },
    { label: "যাচাই চলছে", value: bn(counts.Pending), color: "#D97706", note: "নির্বাহী সম্পাদকের সিদ্ধান্তের অপেক্ষায়" },
    { label: "বাতিল", value: bn(counts.Rejected), color: "#F42A41", note: "কারণসহ রাখা আছে" },
    {
      label: "প্রতিবেদনের ভার্সন",
      value: bn(versions.length),
      color: "#0D1F17",
      note: versions.length ? `সবশেষ ভার্সন ${bn(versions[0].v)}, ${bnVersionDate(versions[0].date)}` : "এখনও কোনো ভার্সন নেই",
    },
  ];

  const confirmDecision = () => {
    if (!deciding || reason.trim().length < 9) return;
    recordDecision(deciding.code, adminId, deciding.to, reason.trim());
    setDecidedHere((x) => [...x, deciding.code]);
    setDeciding(null);
    setReason("");
  };

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
      {/* Profile header */}
      <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="h-[168px] bg-[linear-gradient(120deg,#006A4E_0%,#04543F_58%,#0D1F17_100%)]" />
        <div className="flex flex-wrap items-end gap-5 px-6 pb-[22px]">
          <div className="-mt-[54px] flex size-[124px] flex-none items-center justify-center rounded-xl border-4 border-white bg-surface text-[40px] font-semibold text-primary shadow-card max-md:-mt-10 max-md:size-[88px] max-md:text-[28px]">
            {profile.initial}
          </div>
          <div className="min-w-[260px] flex-1 pt-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-[24px] font-semibold leading-[1.6]">{profile.name}</h2>
              {facts && (
                <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-input bg-role-reviewer/10 px-[9px] py-[3px] text-[11.5px] font-semibold text-role-reviewer">
                  <span className="size-1.5 rounded-full bg-role-reviewer" />
                  {facts.auditState}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11.5px] font-semibold ${
                  profile.account === "Active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}
              >
                <span className={`size-1.5 rounded-full ${profile.account === "Active" ? "bg-success" : "bg-danger"}`} />
                {ACCOUNT_BN[profile.account] ?? profile.account}
              </span>
            </div>
            <p className="mt-[5px] text-[13px] leading-[1.6] text-muted text-pretty">
              {profile.post} · {profile.area} · {facts.wards} · {profile.party}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-[18px] gap-y-2">
              {[
                ["মোবাইল", profile.phone],
                ...(facts
                  ? [
                      ["এনআইডি", bn(facts.nid)],
                      ["অডিট", facts.audit],
                      ["শুরু", facts.opened],
                      ["তদন্ত সম্পাদক", facts.staff],
                    ]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-[7px]">
                  <dt className="text-[10.5px] font-semibold text-muted">{label}</dt>
                  <dd className="text-[12.5px] font-semibold leading-[1.6]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-4 flex flex-none items-center gap-4 rounded-card border border-line px-[18px] py-3.5">
            <div
              role="img"
              aria-label={`প্রোফাইল স্কোর ১০০-এর মধ্যে ${bn(score)}`}
              className="flex size-[82px] flex-none items-center justify-center rounded-full"
              style={{ background: acc.length ? `conic-gradient(#1A7A4A 0% ${score}%, #F42A41 ${score}% 100%)` : "#E3EEEA" }}
            >
              <div className="flex size-[62px] flex-col items-center justify-center rounded-full bg-white">
                <div className="text-[21px] font-bold leading-none">{bn(score)}</div>
                <div className="mt-0.5 text-[9.5px] text-muted">/ ১০০</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-semibold text-muted">প্রোফাইল স্কোর</div>
              <div className="mt-1 text-[13.5px] font-semibold" style={{ color: band.color }}>
                {band.label}
              </div>
              <div className="mt-[3px] text-[11px] leading-[1.45] text-muted">
                গ্রহণ হয়েছে: {bn(pos)} ইতিবাচক · {bn(neg)} নেতিবাচক
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5">
          <div className="flex items-start gap-[9px] rounded-button border border-l-[3px] border-line border-l-primary bg-surface px-3.5 py-[11px]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-px flex-none">
              <circle cx="8" cy="8" r="6.3" stroke="#006A4E" strokeWidth="1.4" />
              <path d="M8 4.6v.2M8 7.2v4.2" stroke="#006A4E" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[11.5px] leading-[1.6] text-pretty">
              স্কোরে শুধু <strong className="font-semibold">গ্রহণ হওয়া</strong> জমা ধরা হয়
              {hasReports ? ` — এখানে ${bn(all.length)}টির মধ্যে ${bn(acc.length)}টি` : ""}। যাচাই চলছে ও বাতিল জমা স্কোরে কোনো প্রভাব ফেলে না। এটি রেকর্ডে যা আছে তার সংক্ষেপ,
              মানুষটি সম্পর্কে কোনো রায় নয়।
            </p>
          </div>
        </div>
      </section>

      <StatTiles stats={stats} />

      {adding ? (
        <AddReportForm
          reviewer={reviewer ? nameOf(db, reviewer.id) : "একজন খালি থাকা নির্বাহী সম্পাদক"}
          onClose={() => setAdding(false)}
          onSubmit={(r) => {
            submit({ ...r, profileId, origin: "staff", staffId: adminId }, adminId);
            setAdding(false);
            setFilter("All");
          }}
        />
      ) : null}

      {/* Reports */}
      <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-[180px] flex-1">
            <h2 className="text-[14.5px] font-semibold">এই প্রোফাইলের জমা</h2>
            <p className="mt-0.5 text-[12px] text-muted">মোট {bn(all.length)}টি</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* The header holds this on larger screens; phones hide header actions. */}
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="h-8 cursor-pointer rounded-button bg-primary px-3 text-[12.5px] font-semibold text-white hover:bg-primary-hover md:hidden"
              >
                + জমা যোগ করুন
              </button>
            )}
            <Link
              href={`/admin/ai-review?profile=${profile.id}`}
              className="inline-flex h-8 items-center rounded-button border border-line bg-white px-3 text-[12.5px] font-semibold text-primary md:hidden"
            >
              অডিট খুলুন
            </Link>
            {(Object.keys(counts) as Filter[]).map((f) => {
              const on = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f)}
                  className={`flex h-8 cursor-pointer items-center gap-[7px] rounded-button border px-3 text-[12.5px] font-semibold ${
                    on ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary hover:text-primary"
                  }`}
                >
                  {FILTER_LABEL[f]}
                  <span className={`rounded-[9px] px-1.5 py-px text-[11px] font-semibold ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>
                    {bn(counts[f])}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!hasReports ? (
          <div className="flex flex-col items-center gap-2 px-6 pt-10 pb-11 text-center">
            <div className="text-[15px] font-semibold">এই প্রোফাইলে এখনও কোনো জমা নেই</div>
            <p className="max-w-[460px] text-[12.5px] leading-[1.75] text-muted text-pretty">
              এই প্রোফাইলে এখনও কোনো জমা আসেনি। তদন্ত সম্পাদককে কাজ দিন অথবা নিজেই একটি জমা যোগ করুন।
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-muted">এই ফিল্টারে কোনো জমা পাওয়া যায়নি।</p>
        ) : (
          <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((r) => {
              const cat = CATEGORY_STYLE[r.category];
              const rejected = r.cur === "Rejected";
              const justDecided = decidedHere.includes(r.code) && r.cur !== "Pending";
              const dispute = disputeForSubmission(db, r.code);
              const decisionLine = justDecided
                ? r.cur === "Accepted"
                  ? "আপনি এইমাত্র গ্রহণ করেছেন · স্কোরে যুক্ত হয়েছে"
                  : "আপনি এইমাত্র বাতিল করেছেন · স্কোরে যুক্ত হয়নি"
                : r.decidedBy
                  ? `${nameOf(db, r.decidedBy)} · ${STATE_CHIP[r.cur].label} ${bnDate(r.decidedAt!)}${dispute ? ` · ${dispute.code} ${dispute.state === "Open" ? "খোলা" : "সমাধান হয়েছে"}` : ""}`
                  : "";
              const by = r.origin === "self" ? `${p.name} (নিজে)` : r.staffId ? `${nameOf(db, r.staffId)} (${r.staffId})` : "—";
              return (
                <li
                  key={r.code}
                  className={`relative flex cursor-pointer flex-col rounded-card border border-l-[3px] border-line p-[15px] hover:border-primary/40 ${rejected ? "bg-[#FAFDFC]" : "bg-white"}`}
                  style={{ borderLeftColor: rejected ? "#C8DDD6" : cat.fg }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold"
                      style={{ color: cat.fg, background: cat.bg }}
                    >
                      <span className="size-[5px] rounded-full" style={{ background: cat.fg }} />
                      {r.category}
                    </span>
                    <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{r.code}</span>
                    <span className="min-w-2.5 flex-1" />
                    <span className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold ${STATE_CHIP[r.cur].cls}`}>
                      <span className={`size-[5px] rounded-full ${STATE_DOT[r.cur]}`} />
                      {STATE_CHIP[r.cur].label}
                    </span>
                  </div>
                  <Link
                    href={`/admin/submissions/${r.code}`}
                    className={`mt-2.5 block text-[14px] font-semibold leading-[1.65] text-pretty after:absolute after:inset-0 after:content-[''] hover:text-primary ${rejected ? "text-muted" : "text-ink"}`}
                  >
                    {r.title}
                  </Link>
                  <p className="mt-1.5 text-[12px] leading-[1.65] text-muted text-pretty">{r.source}</p>
                  <div aria-hidden="true" className="min-h-[11px] flex-1" />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-[#E3EEEA] pt-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-role-staff/12 text-[9.5px] font-semibold text-role-staff">
                        {r.origin === "self" ? p.initial : initialsOf(nameOf(db, r.staffId ?? ""))}
                      </span>
                      <span className="min-w-0 text-[11.5px] text-muted">
                        {by} · {bnDate(r.submittedAt)}
                      </span>
                    </div>
                    <span className="min-w-2 flex-1" />
                    {r.cur === "Pending" && deciding?.code === r.code ? (
                      <form
                        className="relative z-10 flex w-full flex-wrap items-start gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          confirmDecision();
                        }}
                      >
                        <label className="min-w-[220px] flex-1">
                          <span className="sr-only">কারণ</span>
                          <input
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={deciding.to === "Accepted" ? "গ্রহণের কারণ — কোন প্রমাণ আছে" : "বাতিলের কারণ — তদন্ত সম্পাদক এটি দেখবেন"}
                            className={`${inputClass} h-9 text-[13px]`}
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={reason.trim().length < 9}
                          className={`h-9 cursor-pointer rounded-button px-3.5 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${deciding.to === "Accepted" ? "bg-primary hover:bg-primary-hover" : "bg-danger hover:bg-danger-hover"}`}
                        >
                          {deciding.to === "Accepted" ? "গ্রহণ নিশ্চিত করুন" : "বাতিল নিশ্চিত করুন"}
                        </button>
                        <button type="button" onClick={() => setDeciding(null)} className="h-9 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-muted">
                          বাতিল
                        </button>
                      </form>
                    ) : r.cur === "Pending" ? (
                      <div className="relative z-10 flex flex-wrap gap-[9px]">
                        <button
                          type="button"
                          onClick={() => {
                            setDeciding({ code: r.code, to: "Accepted" });
                            setReason("");
                          }}
                          className="h-[34px] cursor-pointer rounded-button bg-primary px-3.5 text-[12.5px] font-semibold text-white hover:bg-primary-hover"
                        >
                          গ্রহণ করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeciding({ code: r.code, to: "Rejected" });
                            setReason("");
                          }}
                          className="h-[34px] cursor-pointer rounded-button border border-danger bg-white px-3.5 text-[12.5px] font-semibold text-danger hover:bg-danger hover:text-white"
                        >
                          বাতিল করুন
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[11.5px] leading-[1.6] text-muted">{decisionLine}</span>
                        {justDecided && (
                          <button
                            type="button"
                            onClick={() => {
                              undoDecision(r.code, adminId);
                              setDecidedHere((x) => x.filter((c) => c !== r.code));
                            }}
                            className="relative z-10 h-[30px] cursor-pointer rounded-button border border-line bg-white px-[11px] text-[11.5px] font-semibold text-muted hover:border-primary hover:text-primary"
                          >
                            আগের মতো করুন
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

type NewReport = { category: Category; title: string; source: string; body: string; evidence: ReturnType<typeof filesToEvidence> };

function AddReportForm({ reviewer, onClose, onSubmit }: { reviewer: string; onClose: () => void; onSubmit: (r: NewReport) => void }) {
  const [category, setCategory] = useState<Category>("ইতিবাচক");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [attempted, setAttempted] = useState(false);
  const evidence = useEvidenceFiles({ maxMB: 10 });
  const sourceOk = plainText(source).trim().length > 0;
  const ready = title.trim().length > 6 && sourceOk;

  return (
    <section className="overflow-hidden rounded-card border border-primary bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-[15px]">
        <div className="min-w-[200px] flex-1">
          <h2 className="text-[14.5px] font-semibold">এই প্রোফাইলে জমা যোগ করুন</h2>
          <p className="mt-0.5 text-[12px] text-muted">স্কোরে ধরার আগে এটি নির্বাহী সম্পাদকের কাছে যাবে</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 cursor-pointer rounded-button border border-line bg-white px-3 text-[12.5px] font-semibold text-muted hover:border-primary hover:text-primary"
        >
          বন্ধ করুন
        </button>
      </div>
      <form
        noValidate
        className="flex flex-col gap-[18px] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setAttempted(true);
          if (!ready) return;
          const text = plainText(source).trim();
          onSubmit({
            category,
            title: title.trim(),
            source: text.length > 90 ? `${text.slice(0, 88)}…` : text,
            body: source,
            evidence: filesToEvidence(evidence.items, `প্রধান নির্বাহী সম্পাদক যোগ করেছেন · ${bnDate(nowIso())}`),
          });
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12.5px] font-semibold">
            ধরন <Required />
          </legend>
          <div role="radiogroup" className="flex flex-wrap gap-2.5">
            {(["ইতিবাচক", "নেতিবাচক"] as Category[]).map((c) => {
              const on = category === c;
              const color = CATEGORY_STYLE[c].fg;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCategory(c)}
                  className={`flex h-11 cursor-pointer items-center gap-[9px] rounded-button border px-4 text-[13.5px] font-semibold ${
                    on ? "bg-[#FAFDFC] text-ink" : "border-line bg-white text-muted hover:border-primary"
                  }`}
                  style={on ? { borderColor: color } : undefined}
                >
                  <span className="size-[15px] flex-none rounded-full border-[4.5px] bg-white" style={{ borderColor: on ? color : "#C8DDD6" }} />
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="np-title" className="text-[12.5px] font-semibold">
            শিরোনাম <Required />
          </label>
          <input
            id="np-title"
            type="text"
            placeholder="যেমন: ওয়ার্ড ১৪-এ পানির লাইন মেরামত শেষ"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputClass} ${attempted && title.trim().length <= 6 ? "border-danger!" : ""}`}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="np-src" className="text-[12.5px] font-semibold">
            সূত্র ও প্রমাণ <Required />
          </label>
          <RichTextEditor
            id="np-src"
            minHeight={130}
            placeholder="কাগজের নাম, তারিখ, অফিস বা যিনি নিজের চোখে দেখেছেন তাঁর পরিচয় লিখুন। প্রমাণ ছাড়া জমা নির্বাহী সম্পাদক বাতিল করবেন।"
            value={source}
            onChange={setSource}
            invalid={attempted && !sourceOk}
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <EvidenceDropzone
            className="h-[128px] flex-[1_1_240px]"
            onFiles={evidence.add}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2.6" y="4.6" width="18.8" height="15" rx="2.2" stroke="#006A4E" strokeWidth="1.5" />
                <path d="m3.4 16.6 4.8-4.1 4.2 3.6 3.3-2.6 5.2 4.2" stroke="#006A4E" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            }
            title="ছবি বা কাগজ যোগ করুন"
            note="সবচেয়ে বেশি ১০ এমবি"
          />
          <div className="flex min-w-0 flex-[1_1_240px] flex-col justify-center gap-2 rounded-card border border-line p-3.5">
            <div className="flex items-center gap-2">
              <span className="size-[7px] rounded-full bg-warning" />
              <span className="text-[12.5px] font-semibold">“যাচাই চলছে” হিসেবে জমা হবে</span>
            </div>
            <p className="text-[11.5px] leading-[1.6] text-muted text-pretty">নির্বাহী সম্পাদক গ্রহণ না করা পর্যন্ত এটি প্রোফাইল স্কোরে যোগ হবে না।</p>
          </div>
        </div>
        <EvidenceList items={evidence.items} error={evidence.error} onRemove={evidence.remove} />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <p className={`min-w-[180px] flex-1 text-[11.5px] leading-normal text-pretty ${ready ? "text-muted" : attempted ? "text-danger" : "text-warning"}`}>
            {ready ? `${category} হিসেবে জমা হবে · যাবে ${reviewer}-এর কাছে (নির্বাহী সম্পাদক)।` : "জমা দেওয়ার আগে শিরোনাম ও সূত্র লিখুন।"}
          </p>
          <div className="flex flex-none gap-2.5">
            <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-button px-4 text-[13.5px] font-semibold text-muted hover:bg-surface hover:text-ink">
              বাতিল
            </button>
            <button
              type="submit"
              className={`h-10 cursor-pointer rounded-button px-5 text-[13.5px] font-semibold ${ready ? "bg-primary text-white hover:bg-primary-hover" : "bg-surface text-muted"}`}
            >
              যাচাইয়ের জন্য জমা দিন
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
