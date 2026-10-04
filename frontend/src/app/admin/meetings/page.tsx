import type { Metadata } from "next";
import { MeetingsView } from "./meetings-view";

export const metadata: Metadata = { title: "মিটিং · প্রধান নির্বাহী সম্পাদক · ALARM" };

/** `?tab=past` opens ended and cancelled meetings. */
export default async function AdminMeetingsPage({ searchParams }: PageProps<"/admin/meetings">) {
  const { tab } = await searchParams;
  return <MeetingsView tab={tab === "past" ? "past" : "upcoming"} />;
}
