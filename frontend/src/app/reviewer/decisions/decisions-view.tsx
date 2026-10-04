"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { bn, bnDate } from "@/lib/db/format";
import { CATEGORY_STYLE, profileOf } from "@/lib/db/selectors";
import type { Submission } from "@/lib/db/types";
import { StartReviewButton } from "../start-review-button";
import { useReviewer } from "../use-reviewer";

import { FILTERS, type Filter } from "./filters";

const accepted = (s: Submission) => s.state === "Accepted";
export const decisionLabel = (s: Submission) => (accepted(s) ? "গ্রহণ হয়েছে" : "বাতিল");

export function ReviewerDecisionsView({ filter }: { filter: Filter }) {
  const { db, decisions, stats } = useReviewer();
  const count = (f: Filter) => (f === "সব" ? decisions.length : decisions.filter((d) => (f === "গ্রহণ হয়েছে") === accepted(d)).length);
  const list = filter === "সব" ? decisions : decisions.filter((d) => (filter === "গ্রহণ হয়েছে") === accepted(d));

  return (
    <>
      <PageHeader crumb="নির্বাহী সম্পাদক পোর্টাল / সিদ্ধান্তের ইতিহাস" title="আমার সাম্প্রতিক সিদ্ধান্ত" action={<StartReviewButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div className="min-w-[180px] flex-1">
              <h2 className="text-[14.5px] font-semibold leading-[1.6]">সাম্প্রতিক সিদ্ধান্ত</h2>
              <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">
                এ মাসের {bn(stats.monthTotal)}টি সিদ্ধান্তের মধ্যে রেকর্ডে থাকা {bn(decisions.length)}টি · প্রতিটি সিদ্ধান্ত অডিট লগে লেখা থাকে
              </p>
            </div>
            <nav aria-label="সিদ্ধান্ত অনুযায়ী ফিল্টার" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const on = f === filter;
                return (
                  <Link
                    key={f}
                    href={f === "সব" ? "/reviewer/decisions" : `/reviewer/decisions?filter=${encodeURIComponent(f)}`}
                    aria-current={on ? "true" : undefined}
                    className={`flex h-8 items-center gap-[7px] rounded-button border px-3 text-[12.5px] font-semibold ${
                      on ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    <span>{f}</span>
                    <span className={`rounded-[9px] px-1.5 py-px text-[11px] font-semibold ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>{bn(count(f))}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {list.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-muted">{decisions.length === 0 ? "এখনও কোনো সিদ্ধান্ত নেননি।" : "এই ফিল্টারে কোনো সিদ্ধান্ত নেই।"}</p>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {list.map((h) => {
                const cat = CATEGORY_STYLE[h.category];
                const ok = accepted(h);
                return (
                  <li key={h.code} className="flex">
                    <Link
                      href={`/reviewer/decisions/${h.code}`}
                      className={`group flex w-full flex-col rounded-card border border-l-[3px] border-line p-[15px] hover:border-primary hover:bg-[#FAFDFC] ${ok ? "bg-white" : "bg-[#FAFDFC]"}`}
                      style={{ borderLeftColor: ok ? cat.fg : "#C8DDD6" }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: cat.fg, background: cat.bg }}>
                          <span className="size-[5px] rounded-full" style={{ background: cat.fg }} />
                          {h.category}
                        </span>
                        <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{h.code}</span>
                        <span className="min-w-2.5 flex-1" />
                        <span className={`inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold ${ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                          <span className={`size-[5px] rounded-full ${ok ? "bg-success" : "bg-danger"}`} />
                          {decisionLabel(h)}
                        </span>
                      </div>
                      <div className={`mt-2.5 text-[13.5px] font-semibold leading-[1.65] text-pretty ${ok ? "text-ink" : "text-muted"}`}>{h.title}</div>
                      <div className="mt-1.5 text-[12px] leading-[1.65] text-muted text-pretty">
                        রাজনৈতিক কর্মী: {profileOf(db, h.profileId)?.name} · সিদ্ধান্ত: {bnDate(h.decidedAt!)}
                      </div>
                      <div aria-hidden="true" className="min-h-[11px] flex-1" />
                      <div className="flex flex-wrap items-center gap-2.5 border-t border-[#E3EEEA] pt-2.5">
                        <p className="min-w-[180px] flex-1 text-[11.5px] leading-[1.7] text-muted text-pretty">
                          <span className="font-semibold text-ink">আপনার কারণ:</span> {h.reason}
                        </p>
                        <span className="inline-flex h-[30px] flex-none items-center gap-[7px] rounded-button border border-line px-[11px] text-[11.5px] font-semibold text-primary group-hover:border-primary group-hover:bg-surface">
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
          <p className="px-5 pt-[13px] pb-4 text-[11.5px] leading-[1.7] text-muted text-pretty">
            এ মাসে মোট {bn(stats.monthTotal)}টি সিদ্ধান্ত নিয়েছেন — {bn(stats.monthAccepted)}টি গ্রহণ, {bn(stats.monthRejected)}টি বাতিল।
          </p>
        </section>
      </div>
    </>
  );
}
