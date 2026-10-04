import type { Metadata } from "next";
import { ReviewerQueueView } from "./queue-view";

export const metadata: Metadata = { title: "যাচাইয়ের তালিকা · ALARM" };

export default function ReviewerQueuePage() {
  return <ReviewerQueueView />;
}
