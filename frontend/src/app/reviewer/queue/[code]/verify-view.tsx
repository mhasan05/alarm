"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { coverageKey, profileOf, submissionOf } from "@/lib/db/selectors";
import { useReviewer } from "../../use-reviewer";
import { ReviewWorkspace } from "./review-workspace";

export function VerifyView({ code }: { code: string }) {
  const { db, reviewer, queue } = useReviewer();
  const item = submissionOf(db, code);
  const profile = item ? profileOf(db, item.profileId) : undefined;
  // Reviewers only open submissions from their own coverage areas.
  const inCoverage = !!(reviewer && profile && reviewer.areas.includes(coverageKey(profile)));
  if (!item || !profile || !inCoverage || !reviewer) return <RecordMissing title="জমাটি পাওয়া যায়নি" backHref="/reviewer/queue" backLabel="তালিকায় ফিরুন" />;

  const next = queue.find((q) => q.code !== code);

  return (
    <>
      <PageHeader backHref="/reviewer/queue" crumb="নির্বাহী সম্পাদক পোর্টাল / যাচাইয়ের অপেক্ষায় / যাচাই" title="জমা যাচাই করুন" />

      <div className="flex flex-1 flex-col gap-4 px-4 pt-[22px] pb-9 sm:px-7">
        <Link
          href="/reviewer/queue"
          className="inline-flex h-[34px] items-center gap-2 self-start rounded-button border border-line bg-white px-[13px] text-[12.5px] font-semibold text-primary hover:border-primary hover:bg-surface max-md:hidden"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.6 2.4 4 7l4.6 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          তালিকায় ফিরুন
        </Link>

        {/* Keyed so moving to the next item starts fresh. */}
        <ReviewWorkspace key={item.code} item={item} profileName={profile.name} reviewerId={reviewer.id} nextCode={next?.code} />
      </div>
    </>
  );
}
