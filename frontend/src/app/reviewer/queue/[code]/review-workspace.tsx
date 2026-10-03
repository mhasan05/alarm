"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { evidenceKind } from "@/components/evidence";
import { inputClass, Required } from "@/components/form";
import { decide as recordDecision, undoDecision } from "@/lib/db/actions";
import { bn, bnDate, daysSince } from "@/lib/db/format";
import { CATEGORY_STYLE, ORIGIN_STYLE } from "@/lib/db/selectors";
import type { Category, Evidence, Submission } from "@/lib/db/types";
import { EvidenceManager, type EvidenceItem } from "../../reviewer-evidence";
import { OVERDUE_DAYS } from "../../use-reviewer";

type Decision = "গৃহীত" | "বাতিল";

const MIN_REASON = 9;
const CATEGORIES: Category[] = ["ইতিবাচক", "নেতিবাচক"];

type Editable = { category: Category; title: string; body: string };

/**
 * Review one submission: read it, optionally correct it (category, title, source text) and its
 * evidence (preview, add, remove) before deciding, then accept or reject with a required reason.
 * Reviewers see the source label only — never the submitter's name.
 */
export function ReviewWorkspace({ item, profileName, reviewerId, nextCode }: { item: Submission; profileName: string; reviewerId: string; nextCode?: string }) {
  // Opened on something already decided (e.g. by another reviewer): show that instead of the form.
  const [openedPending] = useState(item.state === "Pending");
  const days = daysSince(item.submittedAt);
  const original: Editable = { category: item.category, title: item.title, body: item.body };
  const [data, setData] = useState<Editable>(original);
  const [draft, setDraft] = useState<Editable>(original);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [decided, setDecided] = useState<Decision | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>(() =>
    item.evidence.map((e) => ({ id: e.id, title: e.title, meta: e.meta, thumb: e.kind })),
  );

  // Release object URLs of reviewer-added files when leaving the page.
  const evidenceRef = useRef(evidence);
  useEffect(() => {
    evidenceRef.current = evidence;
  }, [evidence]);
  useEffect(() => () => evidenceRef.current.forEach((e) => e.url && URL.revokeObjectURL(e.url)), []);

  const cat = CATEGORY_STYLE[data.category];
  const origin = ORIGIN_STYLE[item.origin];
  const late = days >= OVERDUE_DAYS;
  const evidenceChanged = evidence.some((e) => e.added || e.removed);
  const activeEvidence = evidence.filter((e) => !e.removed).length;
  const changedFields = (Object.keys(original) as (keyof Editable)[]).filter((k) => data[k] !== original[k]);
  const draftValid = draft.title.trim().length > 6 && draft.body.trim().length > 0;
  const reasonOk = reason.trim().length >= MIN_REASON;
  const ready = reasonOk && !editing;

  const FIELD_LABEL: Record<keyof Editable, string> = { category: "শ্রেণি", title: "শিরোনাম", body: "সূত্র ও বিবরণ" };
  const changedLabels = [...changedFields.map((k) => FIELD_LABEL[k]), ...(evidenceChanged ? ["প্রমাণ"] : [])];

  const [evidenceError, setEvidenceError] = useState("");
  const decide = (d: Decision) => {
    setAttempted(true);
    // Accepting publishes the item, so it needs at least one piece of evidence.
    if (d === "গৃহীত" && activeEvidence === 0) {
      setEvidenceError("প্রমাণ ছাড়া গ্রহণ করা যাবে না — অন্তত একটি প্রমাণ রাখুন বা যোগ করুন।");
      return;
    }
    setEvidenceError("");
    if (!ready) return;
    // Record the decision with any edits; edited evidence replaces the submitted list.
    const kept: Evidence[] = evidence
      .filter((e) => !e.removed)
      .map((e) => (e.added && e.file ? { id: e.id, kind: evidenceKind(e.file), title: e.title, meta: "পর্যালোচকের সংযোজন" } : { id: e.id, kind: e.thumb, title: e.title, meta: e.meta }));
    const edits = changedLabels.length ? { category: data.category, title: data.title, body: data.body, evidence: kept } : undefined;
    recordDecision(item.code, reviewerId, d === "গৃহীত" ? "Accepted" : "Rejected", reason.trim(), edits);
    setDecided(d);
  };

  if (!openedPending) {
    return (
      <section className="rounded-card border border-line bg-white px-6 py-8 text-center shadow-card">
        <h2 className="text-[16px] font-semibold">এই জমার সিদ্ধান্ত হয়ে গেছে</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted text-pretty">
          {item.code} আর পর্যালোচনার সারিতে নেই।{item.decidedBy === reviewerId ? " আপনার সিদ্ধান্তের বিস্তারিত ইতিহাসে দেখুন।" : " অন্য একজন পর্যালোচক এটি নিষ্পত্তি করেছেন।"}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          {item.decidedBy === reviewerId && (
            <Link href={`/reviewer/decisions/${item.code}`} className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover">
              সিদ্ধান্ত দেখুন
            </Link>
          )}
          <Link href="/reviewer/queue" className="inline-flex h-10 items-center rounded-button border border-line px-4 text-[13px] font-semibold text-primary hover:border-primary">
            সারিতে ফিরুন
          </Link>
        </div>
      </section>
    );
  }

  return (
    <article className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      {/* Header */}
      <div className="border-b border-l-4 border-line px-[22px] py-[18px]" style={{ borderLeftColor: cat.fg }}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold"
            style={{ color: cat.fg, background: cat.bg }}
          >
            <span className="size-[5px] rounded-full" style={{ background: cat.fg }} />
            {data.category}
          </span>
          <span className="flex-none whitespace-nowrap rounded-input px-2 py-[3px] text-[11px] font-semibold" style={{ color: origin.fg, background: origin.bg }}>
            {origin.label}
          </span>
          <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{item.code}</span>
          {changedLabels.length > 0 && (
            <span className="flex-none whitespace-nowrap rounded-input bg-role-reviewer/10 px-2 py-[3px] text-[11px] font-semibold text-role-reviewer">
              পর্যালোচক সম্পাদিত
            </span>
          )}
          <span className="min-w-2.5 flex-1" />
          <span className={`flex-none whitespace-nowrap text-[11.5px] font-semibold ${late ? "text-danger" : "text-muted"}`}>
            {days === 0 ? "আজ জমা" : `${bn(days)} দিন অপেক্ষমাণ`}
          </span>
        </div>
        {!editing && <h2 className="mt-3 text-[18px] font-semibold leading-[1.65] text-pretty">{data.title}</h2>}
        <p className="mt-1.5 text-[12.5px] leading-[1.65] text-muted">জমা: {bnDate(item.submittedAt)}</p>
      </div>

      {/* Body: read or edit */}
      <div className="flex flex-col gap-5 px-[22px] py-5">
        <div className="flex flex-wrap items-center gap-3 rounded-input border border-line bg-surface px-3.5 py-3">
          <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-primary/12 text-[14px] font-semibold text-primary">
            {profileName.slice(0, 1)}
          </span>
          <div className="min-w-[180px] flex-1">
            <div className="text-[10px] font-semibold tracking-[0.05em] text-muted">কোন রাজনৈতিক কর্মী সম্পর্কে</div>
            <div className="text-[14px] font-semibold leading-[1.6]">{profileName}</div>
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-[18px] rounded-card border border-role-reviewer/40 bg-role-reviewer/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold">তথ্য সম্পাদনা</span>
              <span className="text-[11.5px] text-muted">· মূল জমা অডিট লগে সংরক্ষিত থাকবে</span>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[12.5px] font-semibold leading-[1.6]">
                শ্রেণি <Required />
              </legend>
              <div role="radiogroup" className="flex flex-wrap gap-2.5">
                {CATEGORIES.map((c) => {
                  const on = draft.category === c;
                  const color = CATEGORY_STYLE[c].fg;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setDraft((d) => ({ ...d, category: c }))}
                      className={`flex h-11 cursor-pointer items-center gap-[9px] rounded-button border px-4 text-[13.5px] font-semibold ${
                        on ? "bg-white text-ink" : "border-line bg-white text-muted hover:border-primary"
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
              <label htmlFor="ed-title" className="text-[12.5px] font-semibold leading-[1.6]">
                শিরোনাম <Required />
              </label>
              <input
                id="ed-title"
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className={`${inputClass} ${draft.title.trim().length <= 6 ? "border-danger!" : ""}`}
              />
            </div>

            <div className="flex flex-col gap-[7px]">
              <label htmlFor="ed-body" className="text-[12.5px] font-semibold leading-[1.6]">
                সূত্র ও বিবরণ <Required />
              </label>
              <textarea
                id="ed-body"
                rows={4}
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                className={`${inputClass} h-auto! resize-y py-3 leading-[1.75] ${!draft.body.trim() ? "border-danger!" : ""}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <p className="min-w-[200px] flex-1 text-[11.5px] leading-[1.65] text-muted text-pretty">
                প্রমাণ যোগ বা সরাতে নিচের প্রমাণ অংশ ব্যবহার করুন।
              </p>
              <button
                type="button"
                onClick={() => {
                  setDraft(data);
                  setEditing(false);
                }}
                className="h-10 cursor-pointer rounded-button px-4 text-[13px] font-semibold text-muted hover:bg-surface hover:text-ink"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={!draftValid}
                onClick={() => {
                  setData({ ...draft, title: draft.title.trim(), body: draft.body.trim() });
                  setEditing(false);
                }}
                className="h-10 cursor-pointer rounded-button bg-role-reviewer px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
              >
                পরিবর্তন সংরক্ষণ করুন
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-[10.5px] font-semibold tracking-[0.05em] text-muted">সূত্র ও বিবরণ · SOURCE</div>
              {!decided && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(data);
                    setEditing(true);
                  }}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-button border border-line bg-white px-3 text-[12px] font-semibold text-role-reviewer hover:border-role-reviewer"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10.6 2.6 13.4 5.4 5.6 13.2H2.8v-2.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  তথ্য সম্পাদনা করুন
                </button>
              )}
            </div>
            <p className="mt-2 text-[13.5px] leading-[1.8] text-pretty">{data.body}</p>
          </div>
        )}

        {changedLabels.length > 0 && !editing && (
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-l-[3px] border-line border-l-role-reviewer bg-surface px-3.5 py-2.5 text-[12px] leading-[1.65]">
            <span className="font-semibold">আপনি সম্পাদনা করেছেন:</span>
            <span className="text-muted">{changedLabels.join(", ")}</span>
            <span className="min-w-2 flex-1" />
            {!decided && (
              <button
                type="button"
                onClick={() => {
                  setData(original);
                  setDraft(original);
                  evidence.forEach((e) => e.added && e.url && URL.revokeObjectURL(e.url));
                  setEvidence(evidence.filter((e) => !e.added).map((e) => ({ ...e, removed: false })));
                }}
                className="cursor-pointer text-[12px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
              >
                মূল তথ্যে ফিরিয়ে নিন
              </button>
            )}
          </div>
        )}

        <EvidenceManager items={evidence} onChange={setEvidence} locked={!!decided} />
        {evidenceError && <p className="-mt-3 text-[11.5px] font-semibold text-danger">{evidenceError}</p>}

        {!decided && (
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="rv-reason" className="text-[12.5px] font-semibold leading-[1.6]">
              আপনার সিদ্ধান্তের কারণ <Required />
            </label>
            <textarea
              id="rv-reason"
              rows={3}
              placeholder="কোন প্রমাণের ভিত্তিতে গ্রহণ করছেন, অথবা কেন বাতিল করছেন — স্পষ্ট করে লিখুন। জমাদানকারী মাঠকর্মী এটি দেখতে পাবেন।"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={attempted && !reasonOk}
              className={`${inputClass} h-auto! resize-y py-3 leading-[1.75] ${attempted && !reasonOk ? "border-danger!" : ""}`}
            />
          </div>
        )}
      </div>

      {/* Decision bar / outcome */}
      {decided ? (
        <Outcome
          decided={decided}
          code={item.code}
          reason={reason.trim()}
          edited={changedLabels}
          nextCode={nextCode}
          onUndo={() => {
            undoDecision(item.code, reviewerId);
            setDecided(null);
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-[#FAFDFC] px-[22px] py-4">
          <p
            role="status"
            className={`min-w-[200px] flex-1 text-[11.5px] leading-[1.7] text-pretty ${
              ready ? "text-muted" : attempted ? "text-danger" : "text-warning"
            }`}
          >
            {editing
              ? "সিদ্ধান্তের আগে সম্পাদনা সংরক্ষণ বা বাতিল করুন।"
              : reasonOk
                ? "গ্রহণ করলে তথ্যটি সঙ্গে সঙ্গে প্রোফাইলে প্রকাশিত হবে · বাতিল করলে কারণসহ বন্ধ হবে।"
                : "সিদ্ধান্ত নেওয়ার আগে কারণ লিখুন — এটি অডিট লগে সংরক্ষিত হয়।"}
          </p>
          <div className="flex flex-none flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => decide("বাতিল")}
              className={`h-10 cursor-pointer rounded-button border bg-white px-[18px] text-[13px] font-semibold ${
                ready ? "border-danger text-danger hover:bg-danger/6" : "border-line text-muted"
              }`}
            >
              বাতিল করুন
            </button>
            <button
              type="button"
              onClick={() => decide("গৃহীত")}
              className={`h-10 cursor-pointer rounded-button px-5 text-[13px] font-semibold ${
                ready ? "bg-primary text-white hover:bg-primary-hover" : "bg-surface text-muted"
              }`}
            >
              {changedLabels.length ? "সম্পাদনাসহ গ্রহণ করুন" : "গ্রহণ করুন"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Outcome({
  decided,
  code,
  reason,
  edited,
  nextCode,
  onUndo,
}: {
  decided: Decision;
  code: string;
  reason: string;
  edited: string[];
  nextCode?: string;
  onUndo: () => void;
}) {
  const accepted = decided === "গৃহীত";
  return (
    <div className="flex flex-col items-center gap-3 border-t border-line px-[22px] pt-8 pb-9 text-center">
      <div className={`flex size-14 items-center justify-center rounded-full ${accepted ? "bg-success/12" : "bg-danger/10"}`}>
        {accepted ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#1A7A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="#F42A41" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h2 className="text-[17px] font-semibold leading-[1.6]">{accepted ? "গৃহীত হয়েছে" : "বাতিল করা হয়েছে"}</h2>
      <p className="max-w-[520px] text-[12.5px] leading-[1.75] text-muted text-pretty">
        {accepted
          ? `${code} ${edited.length ? "আপনার সম্পাদনাসহ " : ""}প্রোফাইলে প্রকাশিত হয়েছে এবং স্কোরে গণনা করা হবে।`
          : `${code} কারণসহ বন্ধ করা হয়েছে — প্রোফাইলে দেখা যাবে না, তবে রেকর্ডে সংরক্ষিত থাকবে।`}
      </p>
      <div className="w-full max-w-[520px] rounded-card border border-line bg-surface px-4 py-3 text-left">
        <div className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">আপনার কারণ · অডিট লগে সংরক্ষিত</div>
        <p className="mt-1 text-[13px] leading-[1.7] text-pretty">{reason}</p>
        {edited.length > 0 && <p className="mt-2 text-[11.5px] text-muted">সম্পাদিত: {edited.join(", ")} · মূল জমাও সংরক্ষিত</p>}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onUndo}
          className="h-[42px] cursor-pointer rounded-button px-4 text-[13.5px] font-semibold text-muted hover:bg-surface hover:text-ink"
        >
          সিদ্ধান্ত ফিরিয়ে নিন
        </button>
        <Link
          href="/reviewer/queue"
          className="inline-flex h-[42px] items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-muted hover:border-primary hover:text-primary"
        >
          সারিতে ফিরুন
        </Link>
        {nextCode && (
          <Link
            href={`/reviewer/queue/${nextCode}`}
            className="inline-flex h-[42px] items-center rounded-button bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
          >
            পরবর্তী জমা যাচাই করুন →
          </Link>
        )}
      </div>
    </div>
  );
}
