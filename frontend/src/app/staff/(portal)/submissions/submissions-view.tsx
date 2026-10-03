"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { bn, bnDate } from "@/lib/db/format";
import { CATEGORY_STYLE, profileOf } from "@/lib/db/selectors";
import type { Submission } from "@/lib/db/types";
import { NewSubmissionButton } from "../new-submission-button";
import { STAFF_STATE, useStaff } from "../use-staff";

import { FILTERS, type Filter } from "./filters";

const matches = (s: Submission, f: Filter) =>
  f === "সব" || (f === "পর্যালোচনাধীন" && s.state === "Pending") || (f === "গৃহীত" && s.state === "Accepted") || (f === "বাতিল" && (s.state === "Rejected" || s.state === "Held"));

/** One line under each submission: what happened, in staff terms. */
export function staffNote(s: Submission) {
  if (s.state === "Pending") return `পর্যালোচনার সারিতে অপেক্ষমাণ · ${bn(s.evidence.length)}টি প্রমাণ সংযুক্ত`;
  if (s.state === "Accepted") return "গৃহীত — প্রোফাইলে প্রকাশিত হয়েছে।";
  if (s.state === "Withdrawn") return "গৃহীত হয়েছিল, পরে অভিযোগের ভিত্তিতে অ্যাডমিন প্রত্যাহার করেছেন।";
  return `${s.state === "Held" ? "স্থগিত" : "বাতিল"} — ${s.reason ?? ""}`;
}

export function StaffSubmissionsView({ filter }: { filter: Filter }) {
  const { db, subs } = useStaff();
  const shown = subs.filter((s) => matches(s, filter));

  return (
    <>
      <PageHeader crumb="মাঠকর্মী পোর্টাল / আমার জমা" title="আমার জমা দেওয়া তথ্য" action={<NewSubmissionButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div className="min-w-[180px] flex-1">
              <h2 className="text-[14.5px] font-semibold leading-[1.6]">আমার জমা দেওয়া তথ্য</h2>
              <p className="mt-0.5 text-[12px] leading-[1.65] text-muted">পর্যালোচকের সিদ্ধান্তসহ সব জমা</p>
            </div>
            <nav aria-label="অবস্থা অনুযায়ী ফিল্টার" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const on = f === filter;
                return (
                  <Link
                    key={f}
                    href={f === "সব" ? "/staff/submissions" : `/staff/submissions?filter=${encodeURIComponent(f)}`}
                    aria-current={on ? "true" : undefined}
                    className={`flex h-8 items-center gap-[7px] rounded-button border px-3 text-[12.5px] font-semibold ${
                      on ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    <span>{f}</span>
                    <span className={`rounded-[9px] px-1.5 py-px text-[11px] font-semibold ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>
                      {bn(subs.filter((s) => matches(s, f)).length)}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 pt-10 pb-11 text-center text-[13px] text-muted">
              {subs.length === 0 ? "আপনি এখনও কোনো তথ্য জমা দেননি।" : "এই অবস্থায় কোনো জমা নেই।"}
              {subs.length === 0 && <NewSubmissionButton />}
            </div>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((s) => {
                const cat = CATEGORY_STYLE[s.category];
                const st = STAFF_STATE[s.state];
                const closed = s.state !== "Pending" && s.state !== "Accepted";
                return (
                  <li key={s.code} className="flex">
                    <Link
                      href={`/staff/submissions/${s.code}`}
                      className={`group flex w-full flex-col rounded-card border border-l-[3px] border-line p-[15px] hover:border-primary hover:bg-[#FAFDFC] ${closed ? "bg-[#FAFDFC]" : "bg-white"}`}
                      style={{ borderLeftColor: closed ? "#C8DDD6" : cat.fg }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: cat.fg, background: cat.bg }}>
                          <span className="size-[5px] rounded-full" style={{ background: cat.fg }} />
                          {s.category}
                        </span>
                        <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{s.code}</span>
                        <span className="min-w-2.5 flex-1" />
                        <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: st.fg, background: st.bg }}>
                          <span className="size-[5px] rounded-full" style={{ background: st.fg }} />
                          {st.label}
                        </span>
                      </div>
                      <div className={`mt-2.5 text-[13.5px] font-semibold leading-[1.65] text-pretty ${closed ? "text-muted" : "text-ink"}`}>{s.title}</div>
                      <div className="mt-1.5 text-[12px] leading-[1.65] text-muted text-pretty">
                        {profileOf(db, s.profileId)?.name} · {bnDate(s.submittedAt)}
                      </div>
                      <div aria-hidden="true" className="min-h-[11px] flex-1" />
                      <div className="flex flex-wrap items-center gap-2.5 border-t border-[#E3EEEA] pt-2.5">
                        <p className={`min-w-40 flex-1 text-[11.5px] leading-[1.7] text-pretty ${closed ? "text-danger" : "text-muted"}`}>{staffNote(s)}</p>
                        <span className="inline-flex h-8 flex-none items-center gap-[7px] rounded-button border border-line bg-white px-3 text-[11.5px] font-semibold text-primary group-hover:border-primary group-hover:bg-surface">
                          বিস্তারিত দেখুন
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M5.4 2.4 10 7l-4.6 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
