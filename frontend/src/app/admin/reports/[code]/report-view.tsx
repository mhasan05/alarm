"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { ReportDocument, VersionHistory } from "@/components/report-document";
import { profileOf, reportOf, reviewerOf } from "@/lib/db/selectors";
import { useAdmin } from "../../use-admin";
import { ReportActions } from "./report-actions";

/** One generated audit report. `v` opens a superseded version, trimmed to what that version contained. */
export function ReportView({ code, v }: { code: string; v?: string }) {
  const { db } = useAdmin();
  const report = reportOf(db, code);
  if (!report) return <RecordMissing title="প্রতিবেদনটি পাওয়া যায়নি" backHref="/admin/reports" backLabel="প্রতিবেদন তালিকায় ফিরুন" />;

  const current = report.versions[0];
  const version = report.versions.find((x) => String(x.v) === v) ?? current;
  const approved = report.state === "approved";
  const profile = profileOf(db, report.profileId);
  const reviewer = reviewerOf(db, report.reviewerId);
  const profileHref = `/admin/politicians/${report.profileId}`;
  const versionHref = (n: number) => (n === current.v ? `/admin/reports/${code}` : `/admin/reports/${code}?v=${n}`);

  return (
    <>
      <PageHeader
        backHref="/admin/reports"
        crumb={
          <>
            প্রধান নির্বাহী সম্পাদক পোর্টাল /{" "}
            <Link href="/admin/reports" className="text-primary hover:text-primary-hover">
              প্রতিবেদন
            </Link>{" "}
            /{" "}
            <Link href={profileHref} className="text-primary hover:text-primary-hover">
              {profile?.audit.code ?? report.profileId}
            </Link>
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bn">চূড়ান্ত অডিট প্রতিবেদন</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-bn text-[12px] font-medium ${
                approved ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"
              }`}
            >
              {approved ? "✓ অনুমোদিত" : "অনুমোদনের অপেক্ষায়"}
            </span>
          </span>
        }
        action={<ReportActions approved={approved} code={code} />}
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7 print:p-0">
        {/* Header actions are hidden in the phone app bar, so repeat them here. */}
        <div className="md:hidden print:hidden [&>div]:items-start">
          <ReportActions approved={approved} code={code} />
        </div>

        {!approved && (
          <p role="status" className="rounded-card border border-l-[3px] border-line border-l-warning bg-white px-5 py-3 text-[13px] text-ink shadow-card print:hidden">
            Waiting for {reviewer?.name ?? "the executive editor"} (Executive Editor) to add a remark and sign. Sharing and PDF unlock after sign-off.
            {report.adminNote && <span className="mt-1 block text-[12px] text-muted">Your note on the selection: {report.adminNote}</span>}
          </p>
        )}

        <VersionHistory report={report} version={version} hrefFor={versionHref} />
        <ReportDocument
          report={report}
          version={version}
          audit={profile?.audit.code ?? report.profileId}
          profileHref={profileHref}
          reviewerName={reviewer?.nameBn ?? "—"}
          reviewerInitials={reviewer?.initials ?? "—"}
        />
      </div>
    </>
  );
}
