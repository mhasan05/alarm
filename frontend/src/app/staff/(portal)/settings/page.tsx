import type { Metadata } from "next";
import { StaffSettings } from "./settings-client";

export const metadata: Metadata = { title: "সেটিংস · ALARM" };

export default function StaffSettingsPage() {
  return <StaffSettings />;
}
