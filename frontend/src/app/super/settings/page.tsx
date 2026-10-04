import type { Metadata } from "next";
import { SuperSettings } from "./super-settings";

export const metadata: Metadata = { title: "সেটিংস · সুপার অ্যাডমিন · ALARM" };

export default function SuperSettingsPage() {
  return <SuperSettings />;
}
