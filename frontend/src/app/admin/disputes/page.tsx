import type { Metadata } from "next";
import { DisputesPage } from "./disputes-page";
import type { Tab } from "./disputes-view";

export const metadata: Metadata = { title: "অভিযোগ · অ্যাডমিন · ALARM" };

const TABS: Tab[] = ["open", "resolved", "all"];

/** `?tab=resolved|all` opens that list. */
export default async function AdminDisputesPage({ searchParams }: PageProps<"/admin/disputes">) {
  const { tab } = await searchParams;
  return <DisputesPage initialTab={TABS.includes(tab as Tab) ? (tab as Tab) : "open"} />;
}
