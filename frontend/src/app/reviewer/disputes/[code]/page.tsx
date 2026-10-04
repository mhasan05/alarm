import type { Metadata } from "next";
import { ReviewerDisputeView } from "./dispute-view";

export async function generateMetadata({ params }: PageProps<"/reviewer/disputes/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `${code} · অভিযোগ · ALARM` };
}

export default async function ReviewerDisputePage({ params }: PageProps<"/reviewer/disputes/[code]">) {
  const { code } = await params;
  return <ReviewerDisputeView code={code} />;
}
