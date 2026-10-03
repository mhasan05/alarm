"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { inputClass, Required } from "@/components/form";
import { RecordMissing } from "@/components/record-missing";
import { ReportDocument } from "@/components/report-document";
import { signReport } from "@/lib/db/actions";
import { bnDate } from "@/lib/db/format";
import { profileOf } from "@/lib/db/selectors";
import type { FinalReport } from "@/lib/db/types";
import { useReviewer } from "../../use-reviewer";

const MIN_REMARK = 20;

/** Reviewers see a source label, never the field staff member's name. */
const STAFF_NAME = /[^·,]*\((FS-\d+)\)/g;
function hideStaff(r: FinalReport): FinalReport {
  const mask = (t: string) => t.replace(STAFF_NAME, " মাঠকর্মী");
  return {
    ...r,
    sources: r.sources.map((s) => ({ ...s, meta: mask(s.meta).trim() })),
    positive: r.positive.map((f) => ({ ...f, chain: f.chain?.map((c) => ({ ...c, meta: mask(c.meta) })) })),
    negative: r.negative.map((f) => ({ ...f, chain: f.chain?.map((c) => ({ ...c, meta: mask(c.meta) })) })),
  };
}

export function SignReportView({ code }: { code: string }) {
  const { db, reviewer, reports } = useReviewer();
  const [remark, setRemark] = useState("");
  const [attempted, setAttempted] = useState(false);
  const found = reports.find((r) => r.code === code);
  if (!found || !reviewer) return <RecordMissing title="প্রতিবেদনটি পাওয়া যায়নি" backHref="/reviewer/reports" backLabel="প্রতিবেদন তালিকায় ফিরুন" />;

  const report = hideStaff(found);
  const pending = report.state === "pending";
  const version = report.versions[0];
  const ok = remark.trim().length >= MIN_REMARK;

  return (
    <>
      <PageHeader backHref="/reviewer/reports" crumb="পর্যালোচক পোর্টাল / প্রতিবেদন অনুমোদন / বিস্তারিত" title={`${report.code} · v${version.v}`} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {pending ? (
          <form
            noValidate
            className="rounded-card border border-l-[3px] border-line border-l-role-reviewer bg-white px-5 py-4 shadow-card"
            onSubmit={(e) => {
              e.preventDefault();
              setAttempted(true);
              if (ok) signReport(report.code, reviewer.id, remark);
            }}
          >
            <h2 className="text-[14.5px] font-semibold">পর্যালোচকের মন্তব্য ও স্বাক্ষর</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted text-pretty">
              প্রতিবেদনটি পড়ে দেখুন। আপনার মন্তব্য প্রতিবেদনের ০৫ নম্বর অনুচ্ছেদে ছাপা হবে; স্বাক্ষরের পর অ্যাডমিন এটি শেয়ার ও ডাউনলোড করতে পারবেন।
            </p>
            {report.adminNote && <p className="mt-2 rounded-button bg-surface px-3 py-2 text-[12px] text-ink">অ্যাডমিনের নোট: {report.adminNote}</p>}
            <label htmlFor="rv-remark" className="mt-3 block text-[12.5px] font-semibold">
              মন্তব্য <Required />
            </label>
            <textarea
              id="rv-remark"
              rows={4}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              aria-invalid={attempted && !ok}
              placeholder="প্রমাণের মান, ব্যক্তিকে জবাবের সুযোগ দেওয়া হয়েছিল কি না, এবং কোনো সীমাবদ্ধতা থাকলে তা লিখুন।"
              className={`${inputClass} mt-1.5 h-auto resize-y py-2.5 font-bn ${attempted && !ok ? "border-danger!" : ""}`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className={`min-w-[200px] flex-1 text-[11.5px] ${attempted && !ok ? "text-danger" : "text-muted"}`}>
                {attempted && !ok ? "মন্তব্য আরও বিস্তারিত লিখুন — কমপক্ষে কয়েকটি বাক্য।" : "স্বাক্ষরের পর প্রতিবেদনটি চূড়ান্ত হবে এবং অডিট লগে সংরক্ষিত থাকবে।"}
              </p>
              <Link href="/reviewer/reports" className="px-2 text-[13px] font-semibold text-muted hover:text-ink">
                পরে করব
              </Link>
              <button type="submit" className="h-10 cursor-pointer rounded-button bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
                অনুমোদন ও স্বাক্ষর দিন
              </button>
            </div>
          </form>
        ) : (
          <p role="status" className="rounded-card border border-l-[3px] border-line border-l-success bg-white px-5 py-3.5 text-[13px] text-ink shadow-card">
            আপনি {report.approval ? bnDate(report.approval.at) : ""} তারিখে এই প্রতিবেদনে স্বাক্ষর দিয়েছেন · স্বাক্ষর আইডি {report.approval?.signature}
          </p>
        )}

        <ReportDocument
          report={report}
          version={version}
          audit={profileOf(db, report.profileId)?.audit.code ?? report.profileId}
          reviewerName={reviewer.nameBn}
          reviewerInitials={reviewer.initials}
        />
      </div>
    </>
  );
}
