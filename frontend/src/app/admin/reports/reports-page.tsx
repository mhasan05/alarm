"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { versionDate } from "@/components/report-document";
import { bn } from "@/lib/db/format";
import { profileOf } from "@/lib/db/selectors";
import { useAdmin } from "../use-admin";
import { ReportsView, type ReportRow, type Tab } from "./reports-view";

/** Newest report first; within a report, newest version first. */
export function ReportsPage({ initialTab }: { initialTab: Tab }) {
  const { db } = useAdmin();
  const rows: ReportRow[] = [...db.reports]
    .sort((a, b) => b.code.localeCompare(a.code))
    .flatMap((r) => {
      const p = profileOf(db, r.profileId);
      return r.versions.map((v, i) => ({
        code: r.code,
        v: v.v,
        latest: i === 0,
        date: versionDate(v.date),
        name: r.subject.name,
        profileId: r.profileId,
        meta: p ? `${p.post} · ${p.seat}, ${p.thana}` : "",
        positive: v.positive,
        negative: v.negative,
        href: i === 0 ? `/admin/reports/${r.code}` : `/admin/reports/${r.code}?v=${v.v}`,
      }));
    });

  return (
    <>
      <PageHeader
        crumb="প্রধান নির্বাহী সম্পাদক পোর্টাল / প্রতিবেদন"
        title={
          <>
            <span className="font-bn">প্রতিবেদন</span>
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              এখন প্রতিবেদন {bn(db.reports.length)}টি · মোট ভার্সন {bn(rows.length)}টি
            </span>
          </>
        }
        action={
          <Link href="/admin/ai-review" className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            বিশ্লেষণ চালান
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <ReportsView key={initialTab} rows={rows} initialTab={initialTab} />
      </div>
    </>
  );
}
