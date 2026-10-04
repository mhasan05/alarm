import type { Metadata } from "next";
import { AiReviewPage } from "./ai-review-page";

export const metadata: Metadata = { title: "এআই বিশ্লেষণ যাচাই · ALARM" };

/** `?profile=PRF-…` opens that profile's analysis (the Subject Profile's "Open audit" links here). */
export default async function Page({ searchParams }: PageProps<"/admin/ai-review">) {
  const { profile } = await searchParams;
  return <AiReviewPage profileId={typeof profile === "string" ? profile : undefined} />;
}
