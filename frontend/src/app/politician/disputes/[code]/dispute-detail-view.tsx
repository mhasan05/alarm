"use client";

import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { submissionOf } from "@/lib/db/selectors";
import { AddActivityButton } from "../../add-activity-button";
import { BackLink, DisputeCard, ReportArticle } from "../../report-article";
import { usePolitician } from "../../use-politician";

export function DisputeDetailView({ code }: { code: string }) {
  const { db, disputes } = usePolitician();
  const dispute = disputes.find((d) => d.code === code);
  if (!dispute) return <RecordMissing title="অভিযোগটি পাওয়া যায়নি" backHref="/politician/disputes" backLabel="অভিযোগে ফিরুন" />;
  const report = submissionOf(db, dispute.submissionCode);

  return (
    <>
      <PageHeader backHref="/politician/disputes" crumb="রাজনৈতিক কর্মী পোর্টাল / অভিযোগ / বিস্তারিত" title="অভিযোগের বিস্তারিত" action={<AddActivityButton />} />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <BackLink href="/politician/disputes">অভিযোগে ফিরুন</BackLink>
        <DisputeCard dispute={dispute} workingDays={db.settings.rules.dispute} />
        {report && (
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[12px] font-semibold tracking-[0.03em] text-muted">যে রিপোর্ট নিয়ে অভিযোগ</h2>
            <ReportArticle report={report} dispute={dispute} showFooter={false} />
          </div>
        )}
      </div>
    </>
  );
}
