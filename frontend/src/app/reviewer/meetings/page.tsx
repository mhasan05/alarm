import type { Metadata } from "next";
import { MyMeetings } from "@/components/meetings/my-meetings";

export const metadata: Metadata = { title: "মিটিং · ALARM" };

export default function MeetingsPage() {
  return <MyMeetings portal="পর্যালোচক পোর্টাল" />;
}
