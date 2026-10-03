import type { Metadata } from "next";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "ড্যাশবোর্ড · ALARM" };

export default function DashboardPage() {
  return <DashboardView />;
}
