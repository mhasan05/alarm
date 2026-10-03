import type { Metadata } from "next";
import { PoliticiansPage } from "./politicians-page";
import type { Tab } from "./politicians-view";

export const metadata: Metadata = { title: "রাজনৈতিক কর্মী · অ্যাডমিন · ALARM" };

const TABS: Tab[] = ["directory", "suspended"];

/** `?tab=suspended` opens the suspended accounts list. */
export default async function AdminPoliticiansPage({ searchParams }: PageProps<"/admin/politicians">) {
  const { tab } = await searchParams;
  return <PoliticiansPage initialTab={TABS.includes(tab as Tab) ? (tab as Tab) : "directory"} />;
}
