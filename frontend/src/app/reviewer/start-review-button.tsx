"use client";

import Link from "next/link";
import { useReviewer } from "./use-reviewer";

/** Opens the oldest waiting submission; disabled when the queue is empty. */
export function StartReviewButton() {
  const { queue } = useReviewer();
  const oldest = queue[0];
  if (!oldest) {
    return (
      <span className="inline-flex h-[38px] cursor-not-allowed items-center rounded-button bg-surface px-4 text-[13.5px] font-semibold text-muted" title="সারি খালি">
        পর্যালোচনা শুরু করুন
      </span>
    );
  }
  return (
    <Link href={`/reviewer/queue/${oldest.code}`} className="inline-flex h-[38px] items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
      পর্যালোচনা শুরু করুন
    </Link>
  );
}
