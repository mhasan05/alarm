import type { Metadata } from "next";
import { DISPUTE_TABS, type DisputeTab } from "@/components/disputes/tabs";
import { ReviewerDisputes } from "./disputes-view";

export const metadata: Metadata = { title: "অভিযোগ · নির্বাহী সম্পাদক · ALARM" };

/** Disputes in this নির্বাহী সম্পাদক's area. `?tab=resolved|all` opens that list. */
export default async function ReviewerDisputesPage({ searchParams }: PageProps<"/reviewer/disputes">) {
  const { tab } = await searchParams;
  return <ReviewerDisputes initialTab={DISPUTE_TABS.includes(tab as DisputeTab) ? (tab as DisputeTab) : "open"} />;
}
