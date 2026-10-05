"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { RichText } from "@/components/rich-text";
import { bnDate } from "@/lib/db/format";
import { CATEGORY_STYLE, profileOf } from "@/lib/db/selectors";
import { EvidenceManager } from "../../reviewer-evidence";
import { StartReviewButton } from "../../start-review-button";
import { useReviewer } from "../../use-reviewer";
import { decisionLabel } from "../decisions-view";

/** A past decision reopened: the submission, the evidence judged, and the reason recorded. */
export function DecisionDetailView({ code }: { code: string }) {
  const { db, reviewer, allReports } = useReviewer();
  // Any decided report from this area (decided by this নির্বাহী সম্পাদক or by the প্রধান নির্বাহী সম্পাদক).
  const h = allReports.find((d) => d.code === code && d.state !== "Pending");
  if (!h || !reviewer) return <RecordMissing title="সিদ্ধান্তটি পাওয়া যায়নি" backHref="/reviewer/decisions" backLabel="সকল প্রতিবেদনে ফিরুন" />;

  const profile = profileOf(db, h.profileId);
  const cat = CATEGORY_STYLE[h.category];
  const accepted = h.state === "Accepted";
  const stFg = accepted ? "#1A7A4A" : "#F42A41";

  return (
    <>
      <PageHeader backHref="/reviewer/decisions" crumb="নির্বাহী সম্পাদক পোর্টাল / সকল প্রতিবেদন / বিস্তারিত" title="প্রতিবেদনের বিস্তারিত" action={<StartReviewButton />} />

      <div className="flex flex-1 flex-col gap-4 px-4 pt-[22px] pb-9 sm:px-7">
        <Link
          href="/reviewer/decisions"
          className="inline-flex h-[34px] items-center gap-2 self-start rounded-button border border-line bg-white px-[13px] text-[12.5px] font-semibold text-primary hover:border-primary hover:bg-surface max-md:hidden"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.6 2.4 4 7l4.6 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          সকল প্রতিবেদনে ফিরুন
        </Link>

        <article className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-l-4 border-line px-[22px] py-[18px]" style={{ borderLeftColor: accepted ? cat.fg : "#C8DDD6" }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: cat.fg, background: cat.bg }}>
                <span className="size-[5px] rounded-full" style={{ background: cat.fg }} />
                {h.category}
              </span>
              <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{h.code}</span>
              <span className="min-w-2.5 flex-1" />
              <span className={`inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold ${accepted ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                <span className={`size-[5px] rounded-full ${accepted ? "bg-success" : "bg-danger"}`} />
                {decisionLabel(h)}
              </span>
            </div>
            <h2 className={`mt-3 text-[18px] font-semibold leading-[1.65] text-pretty ${accepted ? "text-ink" : "text-muted"}`}>{h.title}</h2>
            <p className="mt-1.5 text-[12.5px] leading-[1.65] text-muted">সিদ্ধান্ত: {bnDate(h.decidedAt!)}</p>
          </div>

          <div className="flex flex-col gap-5 px-[22px] py-5">
            <div className="flex flex-wrap items-center gap-3 rounded-input border border-line bg-surface px-3.5 py-3">
              <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-primary/12 text-[14px] font-semibold text-primary">{profile?.initial}</span>
              <div className="min-w-[180px] flex-1">
                <div className="text-[10px] font-semibold tracking-[0.05em] text-muted">কোন রাজনৈতিক কর্মী সম্পর্কে</div>
                <div className="text-[14px] font-semibold leading-[1.6]">{profile?.name}</div>
              </div>
            </div>

            <div>
              <div className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">সূত্র ও বিস্তারিত</div>
              <RichText value={h.body} className="mt-2 text-[13.5px] leading-[1.8] text-pretty" />
            </div>

            {h.evidence.length > 0 && (
              <EvidenceManager items={h.evidence.map((e) => ({ id: e.id, title: e.title, meta: e.meta, thumb: e.kind }))} onChange={() => {}} locked />
            )}

            <div className="rounded-button border border-l-[3px] border-line bg-surface px-4 py-3.5" style={{ borderLeftColor: stFg }}>
              <div className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">আপনার সিদ্ধান্তের কারণ</div>
              <p className="mt-[7px] text-[13px] leading-[1.8] text-pretty">{h.reason}</p>
              <p className="mt-[9px] text-[11.5px] leading-[1.65] text-muted">
                {reviewer.nameBn} · নির্বাহী সম্পাদক · {bnDate(h.decidedAt!)}
              </p>
            </div>
          </div>

          <div className="border-t border-line bg-[#FAFDFC] px-[22px] py-[15px] text-[11.5px] leading-[1.7] text-muted text-pretty">
            {accepted
              ? "এই তথ্যটি প্রোফাইলে দেখানো হচ্ছে এবং স্কোরে ধরা হয়েছে। রাজনৈতিক কর্মী চাইলে এ নিয়ে অভিযোগ জানাতে পারেন।"
              : "বাতিল হওয়া তথ্য প্রোফাইলে দেখা যায় না, তবে রেকর্ডে রাখা থাকে। একই তথ্য আবার জমা দেওয়া যাবে না।"}
          </div>
        </article>
      </div>
    </>
  );
}
