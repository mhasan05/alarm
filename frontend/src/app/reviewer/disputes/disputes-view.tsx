"use client";

import { PageHeader } from "@/components/app-shell";
import { DisputeList, type DisputeTab } from "@/components/disputes/dispute-list";
import { bn } from "@/lib/db/format";
import { disputesForReviewer } from "@/lib/db/selectors";
import { useReviewer } from "../use-reviewer";

/** Disputes from political activists in this নির্বাহী সম্পাদক's area. */
export function ReviewerDisputes({ initialTab }: { initialTab: DisputeTab }) {
  const { db, reviewer } = useReviewer();
  const mine = reviewer ? disputesForReviewer(db, reviewer.id) : [];
  const open = mine.filter((d) => d.state === "Open").length;
  return (
    <>
      <PageHeader crumb="নির্বাহী সম্পাদক পোর্টাল / অভিযোগ" title="অভিযোগ" />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-[22px] pb-9 sm:px-7">
        <p className="rounded-card border border-l-[3px] border-line border-l-primary bg-white px-5 py-3.5 text-[13px] leading-[1.7] text-ink shadow-card">
          আপনার এলাকার রাজনৈতিক কর্মীরা যেসব তথ্যে আপত্তি করেছেন। এখন {bn(open)}টি খোলা। অভিযোগ খুলে জমাটি দেখুন, দরকার হলে এডিট করুন (ফাইল যোগ বা সরাতে পারবেন), তারপর কারণসহ সিদ্ধান্ত দিন।
        </p>
        <DisputeList key={initialTab} db={db} disputes={mine} baseHref="/reviewer/disputes" initialTab={initialTab} />
      </div>
    </>
  );
}
