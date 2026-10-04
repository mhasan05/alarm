"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { bn, bnDate } from "@/lib/db/format";
import { CATEGORY_STYLE, ORIGIN_STYLE, profileOf } from "@/lib/db/selectors";
import { StartReviewButton } from "../start-review-button";
import { OVERDUE_DAYS, useReviewer } from "../use-reviewer";

export function ReviewerQueueView() {
  // Oldest first, as the design specifies.
  const { db, queue } = useReviewer();
  const overdue = queue.filter((q) => q.days >= OVERDUE_DAYS);

  return (
    <>
      <PageHeader crumb="নির্বাহী সম্পাদক পোর্টাল / যাচাইয়ের তালিকা" title="অপেক্ষায় থাকা কাজ" action={<StartReviewButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {overdue.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-l-[3px] border-line border-l-danger bg-white px-[18px] py-[15px] shadow-card">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none">
              <circle cx="8" cy="8" r="6.3" stroke="#F42A41" strokeWidth="1.4" />
              <path d="M8 4.4V8l2.4 1.6" stroke="#F42A41" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="min-w-[220px] flex-1 text-[12.5px] leading-[1.75] text-pretty">
              {bn(overdue.length)}টি জমা ৪৮ ঘণ্টার বেশি সময় ধরে অপেক্ষায়। তালিকা খালি না হলে ওই প্রোফাইলে প্রধান নির্বাহী সম্পাদক বিশ্লেষণ শুরু করতে
              পারবেন না।
            </p>
            <Link
              href={`/reviewer/queue/${overdue[0].code}`}
              className="inline-flex h-9 flex-none items-center rounded-button border border-danger bg-white px-3.5 text-[12.5px] font-semibold text-danger hover:bg-danger/6"
            >
              আগে এগুলো দেখুন
            </Link>
          </div>
        )}

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">যাচাইয়ের অপেক্ষায়</h2>
            <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">
              পুরোনো জমা আগে · তদন্ত সম্পাদক ও রাজনৈতিক কর্মী — দুই উৎসের তথ্যই একই নিয়মে যাচাই হয়
            </p>
          </div>

          {queue.length === 0 ? (
            <div className="flex flex-col items-center gap-[15px] px-6 pt-11 pb-12 text-center">
              <div className="flex size-[62px] items-center justify-center rounded-full bg-success/12">
                <svg width="30" height="30" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m4.4 8.4 2.4 2.4 4.8-5.2" stroke="#1A7A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-[16px] font-semibold leading-[1.6]">তালিকা খালি</div>
                <p className="mt-2 max-w-[420px] text-[12.5px] leading-[1.85] text-muted text-pretty">
                  আপনার এলাকার সব জমার সিদ্ধান্ত হয়ে গেছে। নতুন তথ্য এলে এখানে দেখা যাবে এবং আপনাকে জানানো হবে।
                </p>
              </div>
              <Link
                href="/reviewer/decisions"
                className="inline-flex h-10 items-center rounded-button border border-line bg-white px-[17px] text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface"
              >
                সিদ্ধান্তের ইতিহাস দেখুন
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {queue.map((q) => {
                const cat = CATEGORY_STYLE[q.category];
                const origin = ORIGIN_STYLE[q.origin];
                const late = q.days >= OVERDUE_DAYS;
                return (
                  <li key={q.code} className="flex">
                    <Link
                      href={`/reviewer/queue/${q.code}`}
                      className="group flex w-full flex-col rounded-card border border-l-[3px] border-line bg-white p-[15px] text-ink hover:border-primary hover:bg-[#FAFDFC]"
                      style={{ borderLeftColor: late ? "#F42A41" : cat.fg }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold"
                          style={{ color: cat.fg, background: cat.bg }}
                        >
                          <span className="size-[5px] rounded-full" style={{ background: cat.fg }} />
                          {q.category}
                        </span>
                        <span
                          className="flex-none whitespace-nowrap rounded-input px-2 py-[3px] text-[11px] font-semibold"
                          style={{ color: origin.fg, background: origin.bg }}
                        >
                          {origin.label}
                        </span>
                        <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{q.code}</span>
                        <span className="min-w-2.5 flex-1" />
                        <span className={`flex-none whitespace-nowrap text-[11.5px] font-semibold ${late ? "text-danger" : "text-muted"}`}>
                          {q.days === 0 ? "আজ জমা" : `${bn(q.days)} দিন ধরে অপেক্ষায়`}
                        </span>
                      </div>
                      <div className="mt-2.5 text-[13.5px] font-semibold leading-[1.65] text-pretty">{q.title}</div>
                      <div className="mt-1.5 text-[12px] leading-[1.65] text-muted text-pretty">
                        রাজনৈতিক কর্মী: {profileOf(db, q.profileId)?.name} · জমা: {bnDate(q.submittedAt)}
                      </div>
                      <div aria-hidden="true" className="min-h-[11px] flex-1" />
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-[#E3EEEA] pt-2.5">
                        <span className="w-full text-[11.5px] leading-[1.6] text-muted">{bn(q.evidence.length)}টি প্রমাণ দেওয়া আছে · {q.source}</span>
                        <span className="inline-flex h-9 flex-none items-center rounded-button bg-primary px-[15px] text-[12.5px] font-semibold text-white group-hover:bg-primary-hover">
                          যাচাই করুন
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
