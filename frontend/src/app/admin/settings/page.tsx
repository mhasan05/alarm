import type { Metadata } from "next";
import { SettingsPage } from "./settings-page";
import type { Section } from "./settings-view";

export const metadata: Metadata = { title: "সেটিংস · ALARM" };

// Kept here too: values exported from a client module can't be read on the server.
const SECTION_KEYS: Section[] = ["general", "users", "coverage", "parties", "audit"];

/** `?tab=general|coverage|parties|audit`; User Management by default. */
export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const { tab } = await searchParams;
  return <SettingsPage initial={SECTION_KEYS.includes(tab as Section) ? (tab as Section) : "users"} />;
}
