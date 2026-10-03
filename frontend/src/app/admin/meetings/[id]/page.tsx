import type { Metadata } from "next";
import { MeetingDetail } from "./meeting-detail";

export const metadata: Metadata = { title: "মিটিং পরিচালনা · অ্যাডমিন · ALARM" };

/** `?created=1` greets a meeting that was just created. */
export default async function MeetingPage({ params, searchParams }: PageProps<"/admin/meetings/[id]">) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  return <MeetingDetail id={id} created={created === "1"} />;
}
