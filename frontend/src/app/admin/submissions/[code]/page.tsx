import type { Metadata } from "next";
import { SubmissionView } from "./submission-view";

export async function generateMetadata({ params }: PageProps<"/admin/submissions/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `${code} · জমা · ALARM` };
}

/** `?edit=1` opens the editor straight away. */
export default async function FieldReportPage({ params, searchParams }: PageProps<"/admin/submissions/[code]">) {
  const { code } = await params;
  const { edit } = await searchParams;
  return <SubmissionView code={code} startEditing={edit === "1"} />;
}
