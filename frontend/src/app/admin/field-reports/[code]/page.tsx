import type { Metadata } from "next";
import { FieldReportView } from "./field-report-view";

export async function generateMetadata({ params }: PageProps<"/admin/field-reports/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `${code} · Field Report · ALARM` };
}

export default async function FieldReportPage({ params }: PageProps<"/admin/field-reports/[code]">) {
  const { code } = await params;
  return <FieldReportView code={code} />;
}
