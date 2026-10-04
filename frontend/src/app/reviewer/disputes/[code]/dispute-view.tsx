"use client";

import { DisputeResolver } from "@/components/disputes/dispute-resolver";
import { useReviewer } from "../../use-reviewer";

/** The নির্বাহী সম্পাদক resolves a dispute in their area; staff names stay hidden (source label only). */
export function ReviewerDisputeView({ code }: { code: string }) {
  const { reviewer } = useReviewer();
  return <DisputeResolver code={code} actorId={reviewer?.id ?? ""} portal="নির্বাহী সম্পাদক পোর্টাল" listHref="/reviewer/disputes" showStaffNames={false} />;
}
