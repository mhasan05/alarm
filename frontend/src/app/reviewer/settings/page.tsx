import type { Metadata } from "next";
import { ReviewerSettings } from "./settings-client";

export const metadata: Metadata = { title: "সেটিংস · ALARM" };

export default function ReviewerSettingsPage() {
  return <ReviewerSettings />;
}
