import type { Metadata } from "next";
import { AddReviewerPage } from "./add-reviewer-page";

export const metadata: Metadata = { title: "Add Reviewer · ALARM" };

/** New reviewer account; `?edit=REV-…` opens the same form pre-filled. */
export default async function Page({ searchParams }: PageProps<"/admin/reviewers/new">) {
  const { edit } = await searchParams;
  return <AddReviewerPage edit={typeof edit === "string" ? edit : undefined} />;
}
