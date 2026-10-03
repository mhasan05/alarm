import type { Metadata } from "next";
import { StaffSubmissionDetailView } from "./submission-detail-view";

export const metadata: Metadata = { title: "জমার বিস্তারিত · ALARM" };

export default async function SubmissionDetailPage({ params }: PageProps<"/staff/submissions/[code]">) {
  const { code } = await params;
  return <StaffSubmissionDetailView code={code} />;
}
