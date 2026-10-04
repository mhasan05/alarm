import type { Metadata } from "next";
import { SuperDashboard } from "./super-dashboard";

export const metadata: Metadata = { title: "প্রধান নির্বাহী সম্পাদকগণ · সুপার অ্যাডমিন · ALARM" };

export default function SuperDashboardPage() {
  return <SuperDashboard />;
}
