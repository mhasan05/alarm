"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { ChartCard, hatch, StackedDayChart, StatTiles } from "@/components/charts";
import { RecordMissing } from "@/components/record-missing";
import { bn, bnDate } from "@/lib/db/format";
import { disputesForReviewer, profileOf } from "@/lib/db/selectors";
import { StartReviewButton } from "../start-review-button";
import { OVERDUE_DAYS, useReviewer } from "../use-reviewer";

const ACCEPT = "#006A4E";
const REJECT = "#F42A41";

export function ReviewerDashboardView() {
  const { db, reviewer, queue, allReports, stats: s } = useReviewer();
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

  // Oldest waiting first, and the latest decided reports in the area.
  const next = [...queue].sort((x, y) => x.submittedAt.localeCompare(y.submittedAt)).slice(0, 4);
  const recent = allReports
    .filter((r) => r.state !== "Pending")
    .sort((x, y) => (y.decidedAt ?? y.submittedAt).localeCompare(x.decidedAt ?? x.submittedAt))
    .slice(0, 4);

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
          {/* The oldest waiting reports — open one to decide. */}
          <ChartCard title="এখনই যাচাই করুন" sub="সবচেয়ে পুরোনো জমা আগে — একটিতে চাপ দিয়ে সিদ্ধান্ত দিন" className="flex-[1_1_320px]">
            {next.length === 0 ? (
              <p className="mt-4 rounded-button bg-success/5 px-3.5 py-3 text-[12.5px] text-success">যাচাইয়ের অপেক্ষায় কোনো জমা নেই — সব কাজ শেষ।</p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {next.map((q) => {
                  const late = q.days >= OVERDUE_DAYS;
                  return (
                    <li key={q.code} className="border-b border-line last:border-b-0">
                      <Link href={`/reviewer/queue/${q.code}`} className="-mx-2 flex items-center gap-3 rounded-button px-2 py-2.5 hover:bg-surface">
                        <span className="size-2 flex-none rounded-full" style={{ background: late ? REJECT : q.days ? "#D97706" : "#1A7A4A" }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">{q.title}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted">
                            {profileOf(db, q.profileId)?.name} · {q.origin === "self" ? "নিজের দেওয়া তথ্য" : "তদন্ত সম্পাদকের তথ্য"}
                          </span>
                        </span>
                        <span className={`flex-none text-[12px] ${late ? "font-semibold text-danger" : "text-muted"}`}>{q.days ? `${bn(q.days)} দিন` : "আজ"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {queue.length > next.length && (
              <Link href="/reviewer/queue" className="mt-3 block border-t border-line pt-3 text-[12.5px] font-semibold text-primary hover:text-primary-hover">
                আরও {bn(queue.length - next.length)}টি দেখুন →
              </Link>
            )}
          </ChartCard>

          {/* Latest decisions in the area. */}
          <ChartCard title="সাম্প্রতিক প্রতিবেদন" sub="আপনার এলাকায় শেষ যেগুলোর সিদ্ধান্ত হয়েছে" className="flex-[1_1_320px]">
            {recent.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-muted">এখনও কোনো সিদ্ধান্ত হয়নি।</p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {recent.map((r) => {
                  const ok = r.state === "Accepted";
                  return (
                    <li key={r.code} className="border-b border-line last:border-b-0">
                      <Link href={`/reviewer/decisions/${r.code}`} className="-mx-2 flex items-center gap-3 rounded-button px-2 py-2.5 hover:bg-surface">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">{r.title}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted">
                            {profileOf(db, r.profileId)?.name} · {bnDate(r.decidedAt ?? r.submittedAt)}
                          </span>
                        </span>
                        <span className={`flex-none rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{ok ? "গ্রহণ হয়েছে" : "বাতিল"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/reviewer/decisions" className="mt-3 block border-t border-line pt-3 text-[12.5px] font-semibold text-primary hover:text-primary-hover">
              সকল প্রতিবেদন দেখুন →
            </Link>
          </ChartCard>
        </div>
      </div>
    </>
  );
}
