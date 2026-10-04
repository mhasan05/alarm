import type { Metadata } from "next";
import { SettingsPage } from "./settings-page";
import type { Section } from "./settings-view";

export const metadata: Metadata = { title: "সেটিংস · প্রধান নির্বাহী সম্পাদক · ALARM" };

// Kept here too: values exported from a client module can't be read on the server.
const SECTION_KEYS: Section[] = ["general", "users", "roles", "coverage", "parties", "rules", "notifications", "audit", "system"];

/** `?tab=general|roles|coverage|parties|rules|notifications|audit|system`; User Management by default. */
export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const { tab } = await searchParams;
  return <SettingsPage initial={SECTION_KEYS.includes(tab as Section) ? (tab as Section) : "users"} />;
}
