import type { Metadata } from "next";
import { AdminDashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "ড্যাশবোর্ড · প্রধান নির্বাহী সম্পাদক · ALARM" };

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
