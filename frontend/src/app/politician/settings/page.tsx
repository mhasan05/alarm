import type { Metadata } from "next";
import { PoliticianSettings } from "./settings-client";

export const metadata: Metadata = { title: "সেটিংস · ALARM" };

export default function PoliticianSettingsPage() {
  return <PoliticianSettings />;
}
