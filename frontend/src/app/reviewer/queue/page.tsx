import type { Metadata } from "next";
import { ReviewerQueueView } from "./queue-view";

export const metadata: Metadata = { title: "পর্যালোচনার সারি · ALARM" };

export default function ReviewerQueuePage() {
  return <ReviewerQueueView />;
}
