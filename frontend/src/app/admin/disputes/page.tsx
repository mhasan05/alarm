import type { Metadata } from "next";
import { DISPUTE_TABS, type DisputeTab } from "@/components/disputes/tabs";
import { DisputesPage } from "./disputes-page";

export const metadata: Metadata = { title: "অভিযোগ · প্রধান নির্বাহী সম্পাদক · ALARM" };

/** `?tab=resolved|all` opens that list. */
export default async function AdminDisputesPage({ searchParams }: PageProps<"/admin/disputes">) {
  const { tab } = await searchParams;
  return <DisputesPage initialTab={DISPUTE_TABS.includes(tab as DisputeTab) ? (tab as DisputeTab) : "open"} />;
}
