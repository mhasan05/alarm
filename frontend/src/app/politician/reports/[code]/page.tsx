import type { Metadata } from "next";
import { ReportDetailView, type From } from "./report-detail-view";

export const metadata: Metadata = { title: "কার্যক্রমের বিস্তারিত · ALARM" };

const FROM: From[] = ["dashboard", "reports", "disputes"];

export default async function ReportDetailPage({ params, searchParams }: PageProps<"/politician/reports/[code]">) {
  const { code } = await params;
  const { from } = await searchParams;
  return <ReportDetailView code={code} from={FROM.includes(from as From) ? (from as From) : "reports"} />;
}
