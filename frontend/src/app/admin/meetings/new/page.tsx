import type { Metadata } from "next";
import { MeetingForm } from "./meeting-form";

export const metadata: Metadata = { title: "নতুন মিটিং · অ্যাডমিন · ALARM" };

export default function NewMeetingPage() {
  return <MeetingForm />;
}
