import type { Metadata } from "next";
import { ReviewerProfilesView } from "./profiles-view";

export const metadata: Metadata = { title: "আমার প্রোফাইল · পর্যালোচক · ALARM" };

export default function ReviewerProfilesPage() {
  return <ReviewerProfilesView />;
}
