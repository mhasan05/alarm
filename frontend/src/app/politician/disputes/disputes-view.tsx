"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { bnDate } from "@/lib/db/format";
import { canDispute, submissionOf } from "@/lib/db/selectors";
import { AddActivityButton } from "../add-activity-button";
import { disputeView } from "../report-article";
import { usePolitician } from "../use-politician";
import { DisputeForm } from "./dispute-form";

const BackIcon = (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M8.6 2.4 4 7l4.6 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * `report` opens the dispute form for that report (if it can be disputed);
 * `submitted` (a dispute code) shows the confirmation after filing. Otherwise, the dispute list.
 */
export function DisputesView({ report, submitted }: { report?: string; submitted?: string }) {
  const { db, find, disputes } = usePolitician();
  const target = report ? find(report) : undefined;
  const status = target ? canDispute(db, target) : undefined;
  const filed = submitted ? disputes.find((d) => d.code === submitted) : undefined;
  const filedReport = filed ? submissionOf(db, filed.submissionCode) : undefined;
  const days = db.settings.rules.dispute;

  if (target && status?.allowed) {
    return (
      <>
        <PageHeader backHref={`/politician/reports/${target.code}?from=reports`} crumb="রাজনৈতিক কর্মী পোর্টাল / অভিযোগ / নতুন" title="অসঙ্গতির অভিযোগ জানান" action={<AddActivityButton />} />
        <div className="flex flex-1 flex-col gap-4 px-4 pt-[22px] pb-9 sm:px-7">
          <Link
            href={`/politician/reports/${target.code}?from=reports`}
            className="inline-flex h-[34px] items-center gap-2 self-start rounded-button border border-line bg-white px-[13px] text-[12.5px] font-semibold text-primary hover:border-primary hover:bg-surface max-md:hidden"
          >
            {BackIcon}
            বাতিল করে ফিরুন
          </Link>
          <DisputeForm reportCode={target.code} reportTitle={target.title} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader crumb="রাজনৈতিক কর্মী পোর্টাল / অভিযোগ" title="অভিযোগ ও অসঙ্গতি" action={<AddActivityButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {filed && (
          <div role="status" className="flex items-start gap-3 rounded-card border border-l-[3px] border-line border-l-success bg-white px-4 py-3.5 shadow-card">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 flex-none">
              <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#1A7A4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div className="text-[13px] font-semibold leading-[1.6]">অভিযোগ ({filed.code}) জমা হয়েছে</div>
              <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">
                {filedReport?.title} — প্রধান নির্বাহী সম্পাদক রিপোর্টটি পুনরায় যাচাই করে সিদ্ধান্ত জানাবেন, সাধারণত {new Intl.NumberFormat("bn-BD").format(days)} কর্মদিবসের মধ্যে।
              </p>
            </div>
          </div>
        )}

        {report && (!target || !status?.allowed) && (
          <div role="status" className="rounded-card border border-l-[3px] border-line border-l-warning bg-white px-4 py-3.5 text-[12px] leading-[1.65] shadow-card">
            <span className="font-semibold">এই রিপোর্টে অভিযোগ করা যাবে না</span> — {status?.label ?? "রিপোর্টটি পাওয়া যায়নি"}।
          </div>
        )}

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">আমার অভিযোগসমূহ</h2>
            <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">প্রধান নির্বাহী সম্পাদক প্রতিটি অভিযোগ পুনরায় যাচাই করে সিদ্ধান্ত জানাবেন</p>
          </div>

          {disputes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 pt-10 pb-11 text-center">
              <div className="text-[15px] font-semibold leading-[1.6]">কোনো অভিযোগ নেই</div>
              <p className="max-w-[420px] text-[12.5px] leading-[1.8] text-muted text-pretty">কোনো রিপোর্টে অসঙ্গতি মনে হলে সেটির বিস্তারিত পাতা থেকে অভিযোগ জানাতে পারবেন।</p>
              <Link href="/politician/reports" className="mt-2 inline-flex h-9 items-center rounded-button border border-line px-4 text-[13px] font-semibold text-primary hover:border-primary">
                আমার রিপোর্ট দেখুন
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {disputes.map((d) => {
                const v = disputeView(d, days);
                const about = submissionOf(db, d.submissionCode);
                return (
                  <li key={d.code} className="flex">
                    <Link
                      href={`/politician/disputes/${d.code}`}
                      className="group flex w-full flex-col rounded-card border border-l-[3px] border-line bg-white p-[15px] text-ink hover:border-primary hover:bg-[#FAFDFC]"
                      style={{ borderLeftColor: v.fg }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{d.code}</span>
                        <span className="flex-none whitespace-nowrap rounded-input bg-surface px-2 py-[3px] text-[11px] font-semibold text-muted">{d.reason}</span>
                        <span className="min-w-2.5 flex-1" />
                        <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: v.fg, background: v.bg }}>
                          <span className="size-[5px] rounded-full" style={{ background: v.fg }} />
                          {v.state}
                        </span>
                      </div>
                      <div className="mt-2.5 text-[13px] font-semibold leading-[1.65] text-pretty">{about?.title}</div>
                      <p className="mt-1.5 text-[12px] leading-[1.7] text-muted text-pretty">{d.claim}</p>
                      <div aria-hidden="true" className="min-h-[11px] flex-1" />
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-[#E3EEEA] pt-2.5">
                        <span className="flex-none text-[11.5px] leading-[1.6] text-muted">জমা: {bnDate(d.filedAt)}</span>
                        <span className="min-w-[120px] flex-1 text-[11.5px] leading-[1.65] text-pretty" style={{ color: v.outcomeFg }}>
                          {v.outcome}
                        </span>
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
