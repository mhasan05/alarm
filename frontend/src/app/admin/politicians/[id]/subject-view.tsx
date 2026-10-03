"use client";

import Link from "next/link";
import { useState } from "react";
import { StatTiles } from "@/components/charts";
import { RecordMissing } from "@/components/record-missing";
import { EvidenceDropzone, EvidenceList, filesToEvidence, useEvidenceFiles } from "@/components/evidence";
import { inputClass, Required } from "@/components/form";
import { decide as recordDecision, submit, undoDecision } from "@/lib/db/actions";
import { bnDate, enDate, nowIso, phoneIntl } from "@/lib/db/format";
import {
  activeReviewersFor,
  analysisStatus,
  CATEGORY_STYLE,
  disputeForSubmission,
  nameOf,
  profileOf,
  reportsForProfile,
  STATE_EN,
  submissionsFor,
  summarize,
} from "@/lib/db/selectors";
import type { Category, SubmissionState } from "@/lib/db/types";
import { useAdmin } from "../../use-admin";

type State = SubmissionState;
type Filter = "All" | Category | "Pending" | "Rejected";

const STATE_DOT: Record<State, string> = { Accepted: "bg-success", Pending: "bg-warning", Rejected: "bg-danger", Held: "bg-danger", Withdrawn: "bg-muted" };
/** Rejected, held and withdrawn reports are all out of the score and the evidence set. */
const isOut = (s: State) => s === "Rejected" || s === "Held" || s === "Withdrawn";

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

  const profile = { ...p, phone: phoneIntl(p.phone), area: `${p.seat}, ${p.thana}` };
  const subs = submissionsFor(db, profileId);
  const sm = summarize(subs);
  const all = subs.map((r) => ({ ...r, cur: r.state }));
  const acc = all.filter((r) => r.cur === "Accepted");
  const pos = sm.positive;
  const neg = sm.negative;
  const hasReports = all.length > 0;
  const score = sm.score;
  const band = !acc.length
    ? { label: "No accepted reports yet", color: "#4A7060" }
    : score >= 67
      ? { label: "Mostly positive record", color: "#1A7A4A" }
      : score >= 34
        ? { label: "Mixed record", color: "#D97706" }
        : { label: "Mostly negative record", color: "#F42A41" };
  const analysis = analysisStatus(db, profileId);
  const staffCount = new Set(subs.map((s) => s.staffId).filter(Boolean)).size;
  const reviewer = activeReviewersFor(db, profileId)[0];
  const versions = reportsForProfile(db, profileId)[0]?.versions ?? [];
  const auditState = analysis.pending ? "Audit in progress" : analysis.ready ? "Ready for analysis" : versions.length ? "Report issued" : "Collecting";
  const facts = { nid: p.nid, audit: p.audit.code, opened: enDate(p.audit.opened), staff: `${staffCount} জন`, wards: p.wards, auditState };

  const counts: Record<Filter, number> = {
    All: all.length,
    ইতিবাচক: all.filter((r) => r.category === "ইতিবাচক").length,
    নেতিবাচক: all.filter((r) => r.category === "নেতিবাচক").length,
    Pending: all.filter((r) => r.cur === "Pending").length,
    Rejected: all.filter((r) => isOut(r.cur)).length,
  };
  const shown = all.filter((r) => filter === "All" || r.category === filter || r.cur === filter || (filter === "Rejected" && isOut(r.cur)));

  const stats = [
    { label: "TOTAL REPORTS", value: String(all.length), color: "#0D1F17", note: "মোট রিপোর্ট · this profile" },
    { label: "ACCEPTED", value: String(acc.length), color: "#1A7A4A", note: "গৃহীত · counted in the score" },
    { label: "PENDING", value: String(counts.Pending), color: "#D97706", note: "পর্যালোচনাধীন · awaiting reviewer" },
    { label: "REJECTED", value: String(counts.Rejected), color: "#F42A41", note: "বাতিল · kept with its reason" },
    {
      label: "REPORT VERSIONS",
      value: String(versions.length),
      color: "#0D1F17",
      note: versions.length ? `সংস্করণ · latest v${versions[0].v}, ${versions[0].date}` : "সংস্করণ · none yet",
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
                {profile.account}
              </span>
            </div>
            <p className="mt-[5px] text-[13px] leading-[1.6] text-muted text-pretty">
              {profile.post} · {profile.area} · {facts.wards} · {profile.party}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-[18px] gap-y-2">
              {[
                ["PHONE", profile.phone],
                ...(facts
                  ? [
                      ["NID", facts.nid],
                      ["AUDIT", facts.audit],
                      ["OPENED", facts.opened],
                      ["STAFF", facts.staff],
                    ]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-[7px]">
                  <dt className="text-[10.5px] font-semibold tracking-[0.04em] text-muted">{label}</dt>
                  <dd className="text-[12.5px] font-semibold leading-[1.6]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-4 flex flex-none items-center gap-4 rounded-card border border-line px-[18px] py-3.5">
            <div
              role="img"
              aria-label={`Profile score ${score} of 100`}
              className="flex size-[82px] flex-none items-center justify-center rounded-full"
              style={{ background: acc.length ? `conic-gradient(#1A7A4A 0% ${score}%, #F42A41 ${score}% 100%)` : "#E3EEEA" }}
            >
              <div className="flex size-[62px] flex-col items-center justify-center rounded-full bg-white">
                <div className="text-[21px] font-bold leading-none">{score}</div>
                <div className="mt-0.5 text-[9.5px] text-muted">/ 100</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">PROFILE SCORE</div>
              <div className="mt-1 text-[13.5px] font-semibold" style={{ color: band.color }}>
                {band.label}
              </div>
              <div className="mt-[3px] text-[11px] leading-[1.45] text-muted">
                {pos} ইতিবাচক · {neg} নেতিবাচক accepted
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
              The score counts <strong className="font-semibold">accepted</strong> reports only
              {hasReports ? ` — ${acc.length} of ${all.length} here` : ""}. Pending, rejected and withdrawn reports never move it. It summarises what the record holds, not
              a judgement of the person.
            </p>
          </div>
        </div>
      </section>

      <StatTiles stats={stats} />

      {adding ? (
        <AddReportForm
          reviewer={reviewer ? nameOf(db, reviewer.id) : "an available reviewer"}
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
            <h2 className="text-[14.5px] font-semibold">Reports on this profile</h2>
            <p className="mt-0.5 text-[12px] text-muted">এই প্রোফাইলের রিপোর্ট · {all.length} মোট</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* The header holds this on larger screens; phones hide header actions. */}
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="h-8 cursor-pointer rounded-button bg-primary px-3 text-[12.5px] font-semibold text-white hover:bg-primary-hover md:hidden"
              >
                + Add Report
              </button>
            )}
            <Link
              href={`/admin/ai-review?profile=${profile.id}`}
              className="inline-flex h-8 items-center rounded-button border border-line bg-white px-3 text-[12.5px] font-semibold text-primary md:hidden"
            >
              Open audit
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
                  {f}
                  <span className={`rounded-[9px] px-1.5 py-px text-[11px] font-semibold ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>
                    {counts[f]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!hasReports ? (
          <div className="flex flex-col items-center gap-2 px-6 pt-10 pb-11 text-center">
            <div className="text-[15px] font-semibold">No reports on this profile yet</div>
            <p className="max-w-[460px] text-[12.5px] leading-[1.75] text-muted text-pretty">
              এই প্রোফাইলে এখনও কোনো জমা আসেনি। মাঠকর্মী নিয়োগ দিন অথবা নিজেই একটি রিপোর্ট যোগ করুন।
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-muted">No reports match this filter.</p>
        ) : (
          <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((r) => {
              const cat = CATEGORY_STYLE[r.category];
              const rejected = isOut(r.cur);
              const justDecided = decidedHere.includes(r.code) && r.cur !== "Pending";
              const dispute = disputeForSubmission(db, r.code);
              const decisionLine = justDecided
                ? r.cur === "Accepted"
                  ? "আপনি এইমাত্র গ্রহণ করেছেন · স্কোরে যুক্ত হয়েছে"
                  : "আপনি এইমাত্র বাতিল করেছেন · স্কোরে যুক্ত হয়নি"
                : r.decidedBy
                  ? `${nameOf(db, r.decidedBy)} · ${STATE_EN[r.cur].label.toLowerCase()} ${bnDate(r.decidedAt!)}${dispute ? ` · ${dispute.code} ${dispute.state === "Open" ? "open" : "decided"}` : ""}`
                  : r.cur === "Withdrawn"
                    ? "Withdrawn after a dispute"
                    : "";
              const by = r.origin === "self" ? `${p.name} (self)` : r.staffId ? `${nameOf(db, r.staffId)} (${r.staffId})` : "—";
              return (
                <li
                  key={r.code}
                  className={`flex flex-col rounded-card border border-l-[3px] border-line p-[15px] ${rejected ? "bg-[#FAFDFC]" : "bg-white"}`}
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
                    <span className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold ${STATE_EN[r.cur].cls}`}>
                      <span className={`size-[5px] rounded-full ${STATE_DOT[r.cur]}`} />
                      {STATE_EN[r.cur].label}
                    </span>
                  </div>
                  <Link
                    href={`/admin/field-reports/${r.code}`}
                    className={`mt-2.5 block text-[14px] font-semibold leading-[1.65] text-pretty hover:text-primary ${rejected ? "text-muted" : "text-ink"}`}
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
                        className="flex w-full flex-wrap items-start gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          confirmDecision();
                        }}
                      >
                        <label className="min-w-[220px] flex-1">
                          <span className="sr-only">Reason</span>
                          <input
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={deciding.to === "Accepted" ? "গ্রহণের কারণ — কোন প্রমাণে সমর্থিত" : "বাতিলের কারণ — মাঠকর্মী এটি দেখবেন"}
                            className={`${inputClass} h-9 text-[13px]`}
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={reason.trim().length < 9}
                          className={`h-9 cursor-pointer rounded-button px-3.5 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${deciding.to === "Accepted" ? "bg-primary hover:bg-primary-hover" : "bg-danger hover:bg-danger-hover"}`}
                        >
                          {deciding.to === "Accepted" ? "Confirm accept" : "Confirm reject"}
                        </button>
                        <button type="button" onClick={() => setDeciding(null)} className="h-9 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-muted">
                          Cancel
                        </button>
                      </form>
                    ) : r.cur === "Pending" ? (
                      <div className="flex flex-wrap gap-[9px]">
                        <button
                          type="button"
                          onClick={() => {
                            setDeciding({ code: r.code, to: "Accepted" });
                            setReason("");
                          }}
                          className="h-[34px] cursor-pointer rounded-button bg-primary px-3.5 text-[12.5px] font-semibold text-white hover:bg-primary-hover"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeciding({ code: r.code, to: "Rejected" });
                            setReason("");
                          }}
                          className="h-[34px] cursor-pointer rounded-button border border-danger bg-white px-3.5 text-[12.5px] font-semibold text-danger hover:bg-danger hover:text-white"
                        >
                          Reject
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
                            className="h-[30px] cursor-pointer rounded-button border border-line bg-white px-[11px] text-[11.5px] font-semibold text-muted hover:border-primary hover:text-primary"
                          >
                            Undo
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
  const ready = title.trim().length > 6 && source.trim().length > 0;

  return (
    <section className="overflow-hidden rounded-card border border-primary bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-[15px]">
        <div className="min-w-[200px] flex-1">
          <h2 className="text-[14.5px] font-semibold">Add report to this profile</h2>
          <p className="mt-0.5 text-[12px] text-muted">নতুন রিপোর্ট যোগ করুন · goes to the reviewer before it counts</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 cursor-pointer rounded-button border border-line bg-white px-3 text-[12.5px] font-semibold text-muted hover:border-primary hover:text-primary"
        >
          Close
        </button>
      </div>
      <form
        noValidate
        className="flex flex-col gap-[18px] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setAttempted(true);
          if (!ready) return;
          const text = source.trim();
          onSubmit({
            category,
            title: title.trim(),
            source: text.length > 90 ? `${text.slice(0, 88)}…` : text,
            body: text,
            evidence: filesToEvidence(evidence.items, `অ্যাডমিনের সংযোজন · ${bnDate(nowIso())}`),
          });
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12.5px] font-semibold">
            Category · শ্রেণি <Required />
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
            Report title · শিরোনাম <Required />
          </label>
          <input
            id="np-title"
            type="text"
            placeholder="যেমন: ওয়ার্ড ১৪-এ পানির লাইন সংস্কার সম্পন্ন"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputClass} ${attempted && title.trim().length <= 6 ? "border-danger!" : ""}`}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="np-src" className="text-[12.5px] font-semibold">
            Source &amp; evidence · সূত্র ও প্রমাণ <Required />
          </label>
          <textarea
            id="np-src"
            rows={3}
            placeholder="নথির নাম, তারিখ, অফিস বা প্রত্যক্ষদর্শীর পরিচয় লিখুন। প্রমাণ ছাড়া রিপোর্ট পর্যালোচক বাতিল করবেন।"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={`${inputClass} h-auto! resize-y py-[11px] leading-[1.7] ${attempted && !source.trim() ? "border-danger!" : ""}`}
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
            title="Attach photos or documents"
            note="ছবি বা নথি সংযুক্ত করুন · সর্বোচ্চ ১০ MB"
          />
          <div className="flex min-w-0 flex-[1_1_240px] flex-col justify-center gap-2 rounded-card border border-line p-3.5">
            <div className="flex items-center gap-2">
              <span className="size-[7px] rounded-full bg-warning" />
              <span className="text-[12.5px] font-semibold">Submits as Pending review</span>
            </div>
            <p className="text-[11.5px] leading-[1.6] text-muted text-pretty">পর্যালোচক গ্রহণ না করা পর্যন্ত এটি প্রোফাইল স্কোরে যোগ হবে না।</p>
          </div>
        </div>
        <EvidenceList items={evidence.items} error={evidence.error} onRemove={evidence.remove} />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <p className={`min-w-[180px] flex-1 text-[11.5px] leading-normal text-pretty ${ready ? "text-muted" : attempted ? "text-danger" : "text-warning"}`}>
            {ready ? `Submits as ${category} · goes to ${reviewer} (Reviewer).` : "Enter a report title and its source before submitting."}
          </p>
          <div className="flex flex-none gap-2.5">
            <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-button px-4 text-[13.5px] font-semibold text-muted hover:bg-surface hover:text-ink">
              Cancel
            </button>
            <button
              type="submit"
              className={`h-10 cursor-pointer rounded-button px-5 text-[13.5px] font-semibold ${ready ? "bg-primary text-white hover:bg-primary-hover" : "bg-surface text-muted"}`}
            >
              Submit for review
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
