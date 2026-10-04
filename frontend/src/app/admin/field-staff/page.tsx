import type { Metadata } from "next";
import { FieldStaffPage } from "./field-staff-page";
import type { Tab } from "./roster-view";

export const metadata: Metadata = { title: "তদন্ত সম্পাদক · প্রধান নির্বাহী সম্পাদক · ALARM" };

const TABS: Tab[] = ["all", "available", "unavailable"];

/** `?tab=available|unavailable` opens that list. */
export default async function Page({ searchParams }: PageProps<"/admin/field-staff">) {
  const { tab } = await searchParams;
  return <FieldStaffPage initialTab={TABS.includes(tab as Tab) ? (tab as Tab) : "all"} />;
}
