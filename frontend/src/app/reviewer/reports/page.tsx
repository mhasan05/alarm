import type { Metadata } from "next";
import { ReviewerReportsView } from "./reports-view";

export const metadata: Metadata = { title: "প্রতিবেদন অনুমোদন · ALARM" };

export default function ReviewerReportsPage() {
  return <ReviewerReportsView />;
}
