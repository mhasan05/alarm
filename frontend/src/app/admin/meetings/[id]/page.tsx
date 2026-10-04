import type { Metadata } from "next";
import { MeetingDetail } from "./meeting-detail";

export const metadata: Metadata = { title: "মিটিংয়ের বিস্তারিত · প্রধান নির্বাহী সম্পাদক · ALARM" };

/** `?created=1` greets a meeting that was just created. */
export default async function MeetingPage({ params, searchParams }: PageProps<"/admin/meetings/[id]">) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  return <MeetingDetail id={id} created={created === "1"} />;
}
