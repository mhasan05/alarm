import type { Metadata } from "next";
import { DecisionDetailView } from "./decision-detail-view";

export const metadata: Metadata = { title: "সিদ্ধান্তের বিস্তারিত · ALARM" };

export default async function DecisionDetailPage({ params }: PageProps<"/reviewer/decisions/[code]">) {
  const { code } = await params;
  return <DecisionDetailView code={code} />;
}
