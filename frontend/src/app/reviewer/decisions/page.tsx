import type { Metadata } from "next";
import { FILTERS, type Filter } from "./filters";
import { ReviewerDecisionsView } from "./decisions-view";

export const metadata: Metadata = { title: "সিদ্ধান্তের ইতিহাস · ALARM" };

/** `?filter=গ্রহণ হয়েছে|বাতিল` narrows the list. */
export default async function ReviewerDecisionsPage({ searchParams }: PageProps<"/reviewer/decisions">) {
  const { filter } = await searchParams;
  return <ReviewerDecisionsView filter={FILTERS.includes(filter as Filter) ? (filter as Filter) : "সব"} />;
}
