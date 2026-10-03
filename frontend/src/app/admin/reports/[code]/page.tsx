import type { Metadata } from "next";
import { ReportView } from "./report-view";

export async function generateMetadata({ params }: PageProps<"/admin/reports/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `${code} · চূড়ান্ত অডিট প্রতিবেদন · ALARM` };
}

export default async function FinalReportPage({ params, searchParams }: PageProps<"/admin/reports/[code]">) {
  const { code } = await params;
  const { v } = await searchParams;
  return <ReportView code={code} v={typeof v === "string" ? v : undefined} />;
}
