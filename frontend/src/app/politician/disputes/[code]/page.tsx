import type { Metadata } from "next";
import { DisputeDetailView } from "./dispute-detail-view";

export const metadata: Metadata = { title: "অভিযোগের বিস্তারিত · ALARM" };

export default async function DisputeDetailPage({ params }: PageProps<"/politician/disputes/[code]">) {
  const { code } = await params;
  return <DisputeDetailView code={code} />;
}
