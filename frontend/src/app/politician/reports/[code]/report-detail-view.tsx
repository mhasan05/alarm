"use client";

import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { canDispute } from "@/lib/db/selectors";
import { AddActivityButton } from "../../add-activity-button";
import { BackLink, DisputeCard, ReportArticle } from "../../report-article";
import { usePolitician } from "../../use-politician";

/** Where the back button returns, keyed by the `from` query param set by the list that linked here. */
const BACK = {
  dashboard: { href: "/politician/dashboard", label: "ড্যাশবোর্ডে ফিরুন", crumb: "ড্যাশবোর্ড" },
  reports: { href: "/politician/reports", label: "আমার রিপোর্টে ফিরুন", crumb: "আমার রিপোর্ট" },
  disputes: { href: "/politician/disputes", label: "অভিযোগে ফিরুন", crumb: "অভিযোগ" },
} as const;
export type From = keyof typeof BACK;

export function ReportDetailView({ code, from }: { code: string; from: From }) {
  const { db, find, disputeOf } = usePolitician();
  const back = BACK[from];
  const report = find(code);
  if (!report) return <RecordMissing backHref={back.href} backLabel={back.label} />;
  const dispute = disputeOf(code);

  return (
    <>
      <PageHeader backHref={back.href} crumb={`রাজনৈতিক কর্মী পোর্টাল / ${back.crumb} / বিস্তারিত`} title="কাজের বিস্তারিত" action={<AddActivityButton />} />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <BackLink href={back.href}>{back.label}</BackLink>
        <ReportArticle report={report} dispute={dispute} disputeStatus={canDispute(db, report)} />
        {dispute && <DisputeCard dispute={dispute} workingDays={db.settings.rules.dispute} title="এই রিপোর্টে আমার অভিযোগ" />}
      </div>
    </>
  );
}
