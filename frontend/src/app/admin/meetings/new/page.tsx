import type { Metadata } from "next";
import { MeetingForm } from "./meeting-form";

export const metadata: Metadata = { title: "নতুন মিটিং · প্রধান নির্বাহী সম্পাদক · ALARM" };

export default function NewMeetingPage() {
  return <MeetingForm />;
}
