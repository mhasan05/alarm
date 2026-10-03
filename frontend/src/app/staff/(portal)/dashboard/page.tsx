import type { Metadata } from "next";
import { StaffDashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "ড্যাশবোর্ড · ALARM" };

export default function StaffDashboardPage() {
  return <StaffDashboardView />;
}
