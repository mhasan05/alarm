import type { Metadata } from "next";
import { ReviewerProfilesView } from "./profiles-view";

export const metadata: Metadata = { title: "আমার প্রোফাইল · নির্বাহী সম্পাদক · ALARM" };

export default function ReviewerProfilesPage() {
  return <ReviewerProfilesView />;
}
