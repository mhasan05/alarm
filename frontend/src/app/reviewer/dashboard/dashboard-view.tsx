"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { ChartCard, hatch, Meter, StackedDayChart, StatTiles } from "@/components/charts";
import { RecordMissing } from "@/components/record-missing";
import { bn } from "@/lib/db/format";
import { disputesForReviewer } from "@/lib/db/selectors";
import { StartReviewButton } from "../start-review-button";
import { OVERDUE_DAYS, useReviewer } from "../use-reviewer";

const ACCEPT = "#006A4E";
const REJECT = "#F42A41";

export function ReviewerDashboardView() {
  const { db, reviewer, queue, profiles, stats: s } = useReviewer();
  if (!reviewer) return <RecordMissing title="অ্যাকাউন্ট পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;
  const openDisputes = disputesForReviewer(db, reviewer.id).filter((d) => d.state === "Open").length;

  const stats = [
    { label: "তালিকায় অপেক্ষায়", value: s.pending, color: "#D97706", note: "আপনার সিদ্ধান্তের অপেক্ষায়" },
    { label: "৪৮ ঘণ্টার বেশি", value: s.overdue, color: s.overdue ? "#F42A41" : "#1A7A4A", note: "আগে এগুলোর সিদ্ধান্ত দিন" },
    { label: "নিজের দেওয়া তথ্য", value: s.self, color: "#7A3FA8", note: "রাজনৈতিক কর্মী নিজে জমা দিয়েছেন" },
    {
      label: "এ মাসে সিদ্ধান্ত",
      value: s.monthTotal,
      color: "#1A7A4A",
      note: `${bn(s.monthRejected)}টি বাতিল · গত ৭ দিনে ${bn(s.weekAccepted + s.weekRejected)}টি`,
    },
  ];

  const weekTotal = s.weekAccepted + s.weekRejected;

  const maxPending = Math.max(1, ...profiles.map((p) => p.pending));

  const bands = [
    { label: "আজ জমা", count: queue.filter((q) => q.days === 0).length, color: "#1A7A4A" },
    { label: "১ দিন", count: queue.filter((q) => q.days === 1).length, color: "#D97706" },
    { label: "২ দিনের বেশি", count: queue.filter((q) => q.days >= OVERDUE_DAYS).length, color: "#F42A41" },
  ];
  const maxBand = Math.max(1, ...bands.map((b) => b.count));

  return (
    <>
      <PageHeader crumb="নির্বাহী সম্পাদক পোর্টাল / ড্যাশবোর্ড" title="যাচাই এক নজরে" action={<StartReviewButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {openDisputes > 0 && (
          <Link href="/reviewer/disputes" className="flex items-center gap-3 rounded-card border border-l-[3px] border-line border-l-warning bg-white px-5 py-3.5 shadow-card hover:border-primary">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-warning/12 text-warning" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.8 15 14H1zM8 6.2v3.4M8 11.6v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] text-ink">
              আপনার এলাকায় <strong className="font-semibold">{bn(openDisputes)}টি অভিযোগ</strong> সিদ্ধান্তের অপেক্ষায়
            </span>
            <span className="text-[12.5px] font-semibold text-primary">সমাধান করুন →</span>
          </Link>
        )}
        <StatTiles stats={stats} />

        <div className="flex flex-wrap items-stretch gap-5">
          {/* Stacked bars: decisions per day */}
          <ChartCard title="গত ৭ দিনের সিদ্ধান্ত" sub="প্রতিদিন কতটি গ্রহণ ও কতটি বাতিল হয়েছে" className="flex-[2_1_420px]">
            <StackedDayChart
              caption="গত ৭ দিনের সিদ্ধান্ত"
              days={s.week}
              base={{ label: "গ্রহণ হয়েছে", color: ACCEPT }}
              top={{ label: "বাতিল", color: REJECT }}
              footnote={`মোট ${bn(weekTotal)}টি সিদ্ধান্ত · গড়ে দিনে ${bn(Math.round(weekTotal / 7))}টি`}
            />
          </ChartCard>

          {/* Acceptance rate: a headline number, ringed */}
          <ChartCard title="গ্রহণের হার" sub="এ মাসের সব সিদ্ধান্ত" className="flex-[1_1_260px]">
            <div className="mt-5 flex justify-center">
              <div
                role="img"
                aria-label={`এ মাসে গ্রহণের হার ${bn(s.acceptRate)}%`}
                className="flex size-[150px] items-center justify-center rounded-full"
                style={{ background: `conic-gradient(${ACCEPT} 0% ${s.acceptRate}%, ${REJECT} ${s.acceptRate}% 100%)` }}
              >
                <div className="flex size-[104px] flex-col items-center justify-center rounded-full bg-white">
                  <div className="text-[26px] font-bold leading-none">{bn(s.acceptRate)}%</div>
                  <div className="mt-1 text-[11px] text-muted">গ্রহণ হয়েছে</div>
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <ul className="mt-[18px] flex flex-col gap-2.5">
              {[
                { label: "গ্রহণ হয়েছে", value: s.monthAccepted, swatch: ACCEPT },
                { label: "বাতিল", value: s.monthRejected, swatch: hatch(REJECT) },
              ].map((k) => (
                <li key={k.label} className="flex items-center gap-2.5">
                  <span className="size-2.5 flex-none rounded-[3px]" style={{ background: k.swatch }} />
                  <span className="min-w-0 flex-1 text-[12.5px] text-muted">{k.label}</span>
                  <span className="flex-none text-[13px] font-bold text-ink">{bn(k.value)}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>

        <div className="flex flex-wrap items-stretch gap-5">
          <ChartCard title="প্রোফাইল অনুযায়ী তালিকা" sub="কোন প্রোফাইলে কতটি জমা অপেক্ষায়" className="flex-[1_1_320px]">
            <ul className="mt-4 flex flex-col gap-3.5">
              {profiles.length === 0 && <li className="text-[12.5px] text-muted">কোনো এলাকা দেওয়া হয়নি — প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।</li>}
              {profiles.map((p) => {
                const n = p.pending;
                return (
                  <Meter
                    key={p.id}
                    label={p.name}
                    value={n ? `${bn(n)}টি অপেক্ষায়` : "তালিকা খালি"}
                    pct={(n / maxPending) * 100}
                    color={n >= 2 ? "#F42A41" : n ? "#D97706" : "#1A7A4A"}
                  />
                );
              })}
            </ul>
          </ChartCard>

          <ChartCard title="অপেক্ষার সময়" sub="তালিকায় থাকা জমাগুলো কত দিন ধরে অপেক্ষা করছে" className="flex-[1_1_320px]">
            <ul className="mt-4 flex flex-col gap-3.5">
              {bands.map((b) => (
                <Meter key={b.label} label={b.label} value={`${bn(b.count)}টি`} pct={(b.count / maxBand) * 100} color={b.color} dot />
              ))}
            </ul>
            <p className="mt-4 border-t border-[#E3EEEA] pt-3.5 text-[11.5px] leading-[1.7] text-muted text-pretty">
              {s.overdue
                ? `${bn(s.overdue)}টি জমা ৪৮ ঘণ্টার সীমা পার করেছে — এগুলোর সিদ্ধান্ত আগে দিন।`
                : "সব জমা ঠিক সময়ের মধ্যে আছে।"}
            </p>
          </ChartCard>
        </div>
      </div>
    </>
  );
}
