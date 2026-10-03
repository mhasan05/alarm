import type { Metadata } from "next";
import { SignReportView } from "./sign-view";

export const metadata: Metadata = { title: "প্রতিবেদন অনুমোদন · ALARM" };

export default async function ReviewerReportPage({ params }: PageProps<"/reviewer/reports/[code]">) {
  const { code } = await params;
  return <SignReportView code={code} />;
}
