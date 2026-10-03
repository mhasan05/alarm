import type { Metadata } from "next";
import { VerifyView } from "./verify-view";

export const metadata: Metadata = { title: "জমা যাচাই · ALARM" };

export default async function VerifySubmissionPage({ params }: PageProps<"/reviewer/queue/[code]">) {
  const { code } = await params;
  return <VerifyView code={code} />;
}
