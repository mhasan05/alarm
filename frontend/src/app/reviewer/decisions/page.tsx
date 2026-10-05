import type { Metadata } from "next";
import { FILTERS, type Filter } from "./filters";
import { ReviewerDecisionsView } from "./decisions-view";

export const metadata: Metadata = { title: "সকল প্রতিবেদন · ALARM" };

/** `?filter=অপেক্ষায়|গ্রহণ হয়েছে|বাতিল` narrows the list. */
export default async function ReviewerDecisionsPage({ searchParams }: PageProps<"/reviewer/decisions">) {
  const { filter } = await searchParams;
  return <ReviewerDecisionsView filter={FILTERS.includes(filter as Filter) ? (filter as Filter) : "সব"} />;
}
