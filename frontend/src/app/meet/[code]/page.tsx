import type { Metadata } from "next";
import { MeetView } from "./meet-view";

export const metadata: Metadata = { title: "মিটিং · ALARM" };

export default async function MeetPage({ params }: PageProps<"/meet/[code]">) {
  const { code } = await params;
  return <MeetView code={code} />;
}
