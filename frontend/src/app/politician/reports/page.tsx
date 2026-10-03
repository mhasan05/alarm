import type { Metadata } from "next";
import { ReportsView } from "./reports-view";

export const metadata: Metadata = { title: "আমার রিপোর্ট · ALARM" };

export default function ReportsPage() {
  return <ReportsView />;
}
