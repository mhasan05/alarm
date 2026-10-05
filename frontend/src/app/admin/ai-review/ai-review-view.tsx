"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { inputClass } from "@/components/form";
import { generateReport } from "@/lib/db/actions";
import { bn, bnDate, nowIso } from "@/lib/db/format";

export type Finding = {
  id: string;
  kind: "staff" | "ai";
  category: "ইতিবাচক" | "নেতিবাচক";
  title: string;
  meta: string;
  sources: number;
  href?: string;
  suggested: "keep" | "exclude";
};

export type Analysis = {
  profileId: string;
  name: string;
  post: string;
  area: string;
  wards: string;
  audit: string;
  staffCount: number;
  findings: Finding[];
  reportCode: string;
  version: number;
};

type Choice = "keep" | "exclude";

const today = () => bnDate(nowIso());

/**
 * Keep or exclude each finding before the report is written. Excluding anything needs a note,
 * because excluded items stay on the audit record with the admin's reason.
 */
export function AiReviewView({ analysis, admin, adminId, onGenerated }: { analysis: Analysis; admin: string; adminId: string; onGenerated: () => void }) {
  // Frozen on open, so the numbers don't shift once the report is cut.
  const [a] = useState(analysis);
  const initial = () => Object.fromEntries(a.findings.map((f) => [f.id, f.suggested])) as Record<string, Choice>;
  const [choice, setChoice] = useState<Record<string, Choice>>(initial);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const kept = a.findings.filter((f) => choice[f.id] === "keep");
  const excluded = a.findings.length - kept.length;
  const aiAll = a.findings.filter((f) => f.kind === "ai");
  const staffAll = a.findings.length - aiAll.length;
  const pos = kept.filter((f) => f.category === "ইতিবাচক").length;
  const neg = kept.length - pos;
  const sources = kept.reduce((n, f) => n + f.sources, 0);
  const locked = generated !== null;

  const set = (id: string, c: Choice) => !locked && setChoice((m) => ({ ...m, [id]: c }));
  const setAll = (pick: (f: Finding) => Choice) => !locked && setChoice(Object.fromEntries(a.findings.map((f) => [f.id, pick(f)])));

  const generate = () => {
    if (kept.length === 0) return;
    if (excluded > 0 && !note.trim()) {
      setNoteError(true);
      noteRef.current?.focus();
      noteRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    generateReport(
      a.profileId,
      adminId,
      kept.filter((f) => f.kind === "staff").map((f) => f.id),
      kept.filter((f) => f.kind === "ai").map((f) => f.id),
      note,
    );
    onGenerated();
    setGenerated(today());
  };

  const stats = [
    { label: "গ্রহণ করা জমা", value: staffAll, color: "#0D1F17", note: `${bn(a.staffCount)} জন তদন্ত সম্পাদকের কাছ থেকে · তালিকা খালি` },
    { label: "এআই নিজে খুঁজে পেয়েছে", value: aiAll.length, color: "#1D6FC0", note: `পাবলিক রেকর্ড · ${bn(aiAll.filter((f) => choice[f.id] === "keep").length)}টি রাখা হয়েছে` },
    { label: "প্রতিবেদনের জন্য রাখা", value: kept.length, color: "#1A7A4A", note: `মোট ${bn(a.findings.length)}টি তথ্যের মধ্যে` },
    { label: "বাদ দেওয়া", value: excluded, color: "#4A7060", note: "অডিট রেকর্ডে থেকে যাবে" },
  ];

  const generateButton = (full = false) => (
    <button
      type="button"
      onClick={generate}
      disabled={kept.length === 0 || locked}
      className={`inline-flex cursor-pointer items-center justify-center rounded-button bg-primary font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${
        full ? "h-12 w-full text-[15px]" : "h-10 px-4 text-[13.5px]"
      }`}
    >
      চূড়ান্ত প্রতিবেদন তৈরি করুন
    </button>
  );

  return (
    <>
      <PageHeader
        backHref={`/admin/politicians/${a.profileId}`}
        crumb={
          <>
            <Link href={`/admin/politicians/${a.profileId}`} className="text-primary hover:text-primary-hover">
              {a.audit}
            </Link>{" "}
            / <span className="font-bn">এআই বিশ্লেষণ · ধাপ ৫</span>
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bn">{a.name}</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${
                locked ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {locked ? "প্রতিবেদন তৈরি হয়েছে" : "আপনার বাছাইয়ের অপেক্ষায়"}
            </span>
            <span className="block w-full font-bn text-[12.5px] font-normal text-muted max-md:hidden">
              {a.post} · {a.area}
              {a.wards && ` · ${a.wards}`}
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/admin/politicians/${a.profileId}`}
              className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
            >
              অডিটে ফিরুন
            </Link>
            {generateButton()}
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <div className="flex gap-3 rounded-card border border-line border-l-[3px] border-l-primary bg-white px-5 py-4 shadow-card">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-none text-primary">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 7.2v3.6M8 5.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-[13px] leading-relaxed text-ink text-pretty">
            এআই প্রতিটি গ্রহণ করা জমাকে ইতিবাচক ও নেতিবাচক তথ্যে ভাগ করেছে এবং যোগ করার মতো কিছু আছে কি না তা পাবলিক রেকর্ডে খুঁজেছে।{" "}
            <strong className="font-semibold">এখানকার কিছুই এখনও প্রতিবেদনে যায়নি।</strong> যা কাজের তা রাখুন, বাকিগুলো বাদ দিন — শুধু রাখা তথ্যই
            প্রতিবেদনে লেখা হবে।
          </p>
        </div>

        <StatTiles stats={stats} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-5 py-3.5 shadow-card">
          <p role="status" className="text-[13px] text-muted">
            {excluded === 0
              ? `${bn(a.findings.length)}টি তথ্যের সবগুলোই প্রতিবেদনের জন্য রাখা হয়েছে।`
              : `${bn(a.findings.length)}টি তথ্যের মধ্যে ${bn(excluded)}টি বাদ দেওয়া হয়েছে। এগুলো আপনার নোটসহ অডিট রেকর্ডে থেকে যাবে।`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() => setAll(() => "keep")}
              className="h-9 cursor-pointer rounded-button border border-line bg-white px-3.5 text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              সব রাখুন
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => setAll((f) => (f.kind === "staff" ? "keep" : "exclude"))}
              className="h-9 cursor-pointer rounded-button border border-line bg-white px-3.5 text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              শুধু তদন্তের প্রমাণ রাখুন
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {(["ইতিবাচক", "নেতিবাচক"] as const).map((cat) => {
            const list = a.findings.filter((f) => f.category === cat);
            const keptHere = list.filter((f) => choice[f.id] === "keep").length;
            const positive = cat === "ইতিবাচক";
            return (
              <section key={cat} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                <div className={`flex items-start justify-between gap-3 border-b border-line px-5 py-4 ${positive ? "bg-success/8" : "bg-danger/8"}`}>
                  <div>
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                      <span className={`size-2 rounded-full ${positive ? "bg-success" : "bg-danger"}`} aria-hidden="true" />
                      {positive ? "ইতিবাচক কাজ" : "নেতিবাচক কাজ"}
                    </h2>
                  </div>
                  <span className={`text-[12.5px] font-semibold ${positive ? "text-success" : "text-danger"}`}>
                    {bn(list.length)}টির মধ্যে {bn(keptHere)}টি রাখা
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-muted">এই প্রোফাইলে কোনো {positive ? "ইতিবাচক" : "নেতিবাচক"} তথ্য নেই।</p>
                ) : (
                  <ul className="flex flex-col gap-3 p-4">
                    {list.map((f) => (
                      <FindingCard key={f.id} finding={f} choice={choice[f.id]} locked={locked} onChoose={(c) => set(f.id, c)} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,445px)]">
          <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <label htmlFor="ai-note" className="block">
              <span className="block text-[15px] font-semibold text-ink">বাছাইয়ের কারণ — প্রধান নির্বাহী সম্পাদকের নোট</span>
              <span className="mt-0.5 block text-[12px] text-muted">
                প্রতিবেদনের ভার্সনের সাথে সেভ থাকবে, নির্বাহী সম্পাদক দেখতে পাবেন
                {excluded > 0 && <span className="text-danger"> · কিছু বাদ দিলে নোট লিখতে হবে</span>}
              </span>
            </label>
            <textarea
              id="ai-note"
              ref={noteRef}
              rows={8}
              value={note}
              disabled={locked}
              aria-invalid={noteError}
              aria-describedby="ai-note-error"
              onChange={(e) => {
                setNote(e.target.value);
                if (e.target.value.trim()) setNoteError(false);
              }}
              placeholder="কেন কিছু বাদ দেওয়া হলো তা লিখুন — উৎস নেই, জবাব মেলেনি, বা প্রমাণ দাবির সঙ্গে মেলে না।"
              className={`${inputClass} mt-3 h-auto resize-y py-2.5 disabled:bg-surface ${noteError ? "border-danger!" : ""}`}
            />
            {noteError && (
              <p id="ai-note-error" className="mt-2 text-[12px] text-danger">
                প্রতিবেদন তৈরির আগে বাদ দেওয়া {bn(excluded)}টি তথ্যের কারণ জানিয়ে একটি নোট লিখুন।
              </p>
            )}
          </section>

          <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <h2 className="text-[15px] font-semibold text-ink">প্রতিবেদনের প্রিভিউ</h2>
            <p className="mt-0.5 font-bn text-[12px] text-muted">প্রতিবেদনে যা যাবে</p>
            <dl className="mt-4 flex flex-col gap-3 border-b border-line pb-4 text-[13px]">
              {[
                { label: "ইতিবাচক কাজ", value: pos, dot: "bg-success", fg: "text-success" },
                { label: "নেতিবাচক কাজ", value: neg, dot: "bg-danger", fg: "text-danger" },
                { label: "লেখা উৎস", value: sources, dot: "bg-primary", fg: "text-ink" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <dt className="flex items-center gap-2.5 text-ink">
                    <span className={`size-2 rounded-full ${r.dot}`} aria-hidden="true" />
                    {r.label}
                  </dt>
                  <dd className={`text-[14px] font-semibold ${r.fg}`}>{bn(r.value)}</dd>
                </div>
              ))}
            </dl>

            {locked ? (
              <div role="status" className="mt-4">
                <p className="text-[13px] font-semibold text-success">
                  {a.reportCode} ভার্সন {bn(a.version)} তৈরি হয়েছে · {bn(kept.length)}টি তথ্য, {bn(sources)}টি উৎস।
                </p>
                <p className="mt-1 text-[12px] leading-normal text-muted">
                  বাছাই লক করা হয়েছে। প্রতিবেদনটি চূড়ান্ত — এখনই খুলে শেয়ার বা ডাউনলোড করা যাবে। নতুন তথ্য যোগ করে আবার বিশ্লেষণ করলে তবেই নতুন ভার্সন তৈরি হবে।
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/reports/${a.reportCode}`}
                    className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
                  >
                    প্রতিবেদন খুলুন
                  </Link>
                  <Link
                    href="/admin/ai-review"
                    className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
                  >
                    অন্য প্রোফাইল
                  </Link>
                </div>
                <p className="mt-3 text-[11.5px] text-muted">
                  সই: {admin} · প্রধান নির্বাহী সম্পাদক · {generated}
                </p>
              </div>
            ) : (
              <>
                <p className="mt-4 text-[12px] leading-normal text-muted text-pretty">
                  এটি {a.reportCode} ভার্সন {bn(a.version)} হিসেবে তৈরি হবে
                  {a.version > 1 ? " — নতুন ভার্সন, কারণ আগের ভার্সনের পর নতুন গ্রহণ করা তথ্য এসেছে।" : "। নতুন তথ্য যোগ করে আবার বিশ্লেষণ করলে তবেই নতুন ভার্সন তৈরি হবে।"}
                </p>
                <div className="mt-4">{generateButton(true)}</div>
                <p className="mt-2.5 text-center text-[11.5px] text-muted">
                  {kept.length === 0 ? "প্রতিবেদন তৈরি করতে অন্তত একটি তথ্য রাখুন।" : `সই: ${admin} · প্রধান নির্বাহী সম্পাদক · ${today()}`}
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function FindingCard({ finding: f, choice, locked, onChoose }: { finding: Finding; choice: Choice; locked: boolean; onChoose: (c: Choice) => void }) {
  const keep = choice === "keep";
  return (
    <li className={`rounded-card border border-line p-4 ${keep ? "bg-white" : "bg-[#FAFDFC]"}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
            f.kind === "staff" ? "bg-success/10 text-success" : "bg-role-reviewer/10 text-role-reviewer"
          }`}
        >
          {f.kind === "staff" ? "তদন্ত সম্পাদকের প্রমাণ" : "এআই খুঁজে পেয়েছে — পাবলিক রেকর্ড"}
        </span>
        <span className={`text-[11.5px] font-semibold ${keep ? "text-success" : "text-muted"}`}>{keep ? "প্রতিবেদনে আছে" : "বাদ দেওয়া"}</span>
      </div>
      {f.href ? (
        <Link href={f.href} className={`mt-2.5 block font-bn text-[14px] font-semibold hover:text-primary ${keep ? "text-ink" : "text-muted"}`}>
          {f.title}
        </Link>
      ) : (
        <p className={`mt-2.5 font-bn text-[14px] font-semibold ${keep ? "text-ink" : "text-muted"}`}>{f.title}</p>
      )}
      <p className="mt-1 font-bn text-[12px] text-muted">{f.meta}</p>
      <div role="group" aria-label={`রাখুন বা বাদ দিন: ${f.title}`} className="relative z-10 mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={keep}
          disabled={locked}
          onClick={() => onChoose("keep")}
          className={`h-10 cursor-pointer rounded-button border text-[13.5px] font-semibold disabled:cursor-not-allowed ${
            keep ? "border-primary bg-primary text-white" : "border-line bg-white text-primary hover:border-primary"
          }`}
        >
          রাখুন
        </button>
        <button
          type="button"
          aria-pressed={!keep}
          disabled={locked}
          onClick={() => onChoose("exclude")}
          className={`h-10 cursor-pointer rounded-button border text-[13.5px] font-semibold disabled:cursor-not-allowed ${
            !keep ? "border-muted bg-muted text-white" : "border-line bg-white text-muted hover:border-muted"
          }`}
        >
          বাদ দিন
        </button>
      </div>
    </li>
  );
}
