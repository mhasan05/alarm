import type { Metadata } from "next";
import { ReportsPage } from "./reports-page";
import type { Tab } from "./reports-view";

export const metadata: Metadata = { title: "প্রতিবেদন · প্রধান নির্বাহী সম্পাদক · ALARM" };

const TABS: Tab[] = ["latest", "all", "draft", "superseded"];

/** `?tab=all|draft|superseded` opens that list. */
export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const { tab } = await searchParams;
  return <ReportsPage initialTab={TABS.includes(tab as Tab) ? (tab as Tab) : "latest"} />;
}
