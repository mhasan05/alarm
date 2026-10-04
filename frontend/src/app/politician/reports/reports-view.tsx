"use client";

import { PageHeader } from "@/components/app-shell";
import { bn } from "@/lib/db/format";
import { AddActivityButton } from "../add-activity-button";
import { ReportCard } from "../report-card";
import { usePolitician } from "../use-politician";

export function ReportsView() {
  const { published, ownOpen, disputeOf } = usePolitician();

  return (
    <>
      <PageHeader crumb="রাজনৈতিক কর্মী পোর্টাল / আমার রিপোর্ট" title="আমার সব রিপোর্ট" action={<AddActivityButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {ownOpen.length > 0 && (
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[14.5px] font-semibold leading-[1.6]">আমার জমা দেওয়া কার্যক্রম</h2>
              <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">আপনি নিজে যোগ করেছেন · নির্বাহী সম্পাদক গ্রহণ করলে প্রোফাইলে প্রকাশিত হবে</p>
            </div>
            <div className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {ownOpen.map((r) => (
                <ReportCard key={r.code} report={r} from="reports" meta="state" />
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div className="min-w-[180px] flex-1">
              <h2 className="text-[14.5px] font-semibold leading-[1.6]">প্রকাশিত রিপোর্ট</h2>
              <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">নির্বাহী সম্পাদক গ্রহণ করেছেন এমন তথ্য · {bn(published.length)}টি কার্যক্রম</p>
            </div>
          </div>

          {published.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 pt-10 pb-11 text-center">
              <div className="text-[15px] font-semibold leading-[1.6]">এখনও কোনো গৃহীত রিপোর্ট নেই</div>
              <p className="max-w-[420px] text-[12.5px] leading-[1.8] text-muted text-pretty">নির্বাহী সম্পাদক কোনো তথ্য গ্রহণ করলে সেটি এখানে দেখা যাবে।</p>
            </div>
          ) : (
            <div className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {published.map((r) => (
                <ReportCard key={r.code} report={r} dispute={disputeOf(r.code)} from="reports" meta="state" />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
