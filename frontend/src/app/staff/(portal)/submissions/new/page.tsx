import type { Metadata } from "next";
import { NewSubmissionView } from "./new-submission-view";

export const metadata: Metadata = { title: "নতুন তথ্য জমা · ALARM" };

/** `?profile=PRF-…` locks the form to that assignment. */
export default async function NewSubmissionPage({ searchParams }: PageProps<"/staff/submissions/new">) {
  const { profile } = await searchParams;
  return <NewSubmissionView profile={typeof profile === "string" ? profile : undefined} />;
}
