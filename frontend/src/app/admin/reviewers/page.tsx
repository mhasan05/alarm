import type { Metadata } from "next";
import { ReviewersPage } from "./reviewers-page";
import type { Tab } from "./reviewers-view";

export const metadata: Metadata = { title: "নির্বাহী সম্পাদক · প্রধান নির্বাহী সম্পাদক · ALARM" };

const TABS: Tab[] = ["all", "active", "unavailable"];

/** `?tab=active|unavailable` opens that list. */
export default async function Page({ searchParams }: PageProps<"/admin/reviewers">) {
  const { tab } = await searchParams;
  return <ReviewersPage initialTab={TABS.includes(tab as Tab) ? (tab as Tab) : "all"} />;
}
