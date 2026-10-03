import type { Metadata } from "next";
import { FILTERS, type Filter } from "./filters";
import { StaffSubmissionsView } from "./submissions-view";

export const metadata: Metadata = { title: "আমার জমা · ALARM" };

/** `?filter=<state>` narrows the list. */
export default async function StaffSubmissionsPage({ searchParams }: PageProps<"/staff/submissions">) {
  const { filter } = await searchParams;
  return <StaffSubmissionsView filter={FILTERS.includes(filter as Filter) ? (filter as Filter) : "সব"} />;
}
