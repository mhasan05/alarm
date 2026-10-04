import type { Metadata } from "next";
import { SubmissionsView, type Tab } from "./submissions-view";

const TABS: Tab[] = ["all", "pending", "accepted", "closed"];

export const metadata: Metadata = { title: "সব জমা · প্রধান নির্বাহী সম্পাদক · ALARM" };

/** Every submission from তদন্ত সম্পাদক and রাজনৈতিক কর্মী in one list. `?tab=pending|accepted|closed`. */
export default async function AdminSubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  const { tab } = await searchParams;
  return <SubmissionsView initialTab={TABS.includes(tab as Tab) ? (tab as Tab) : "all"} />;
}
