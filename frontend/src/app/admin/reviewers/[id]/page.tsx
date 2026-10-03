import type { Metadata } from "next";
import { ReviewerDetailView } from "./reviewer-detail-view";

export async function generateMetadata({ params }: PageProps<"/admin/reviewers/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · পর্যালোচক · ALARM` };
}

export default async function ReviewerDetailPage({ params }: PageProps<"/admin/reviewers/[id]">) {
  const { id } = await params;
  return <ReviewerDetailView id={id} />;
}
