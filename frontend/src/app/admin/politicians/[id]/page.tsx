import type { Metadata } from "next";
import { SubjectPage } from "./subject-page";

export const metadata: Metadata = { title: "Subject Profile · ALARM" };

/** `?add=1` opens the "Add report" form (the header button links there). */
export default async function SubjectProfilePage({ params, searchParams }: PageProps<"/admin/politicians/[id]">) {
  const { id } = await params;
  const { add } = await searchParams;
  return <SubjectPage id={id} adding={add === "1"} />;
}
