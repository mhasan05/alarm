import type { Metadata } from "next";
import { AdminDashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "ড্যাশবোর্ড · অ্যাডমিন · ALARM" };

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
