import type { Metadata } from "next";
import { ReviewerDashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "ড্যাশবোর্ড · নির্বাহী সম্পাদক · ALARM" };

export default function ReviewerDashboardPage() {
  return <ReviewerDashboardView />;
}
