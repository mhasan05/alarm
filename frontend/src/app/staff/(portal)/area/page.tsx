import type { Metadata } from "next";
import { StaffAreaView } from "./area-view";

export const metadata: Metadata = { title: "কাজের এলাকা ও নিয়ম · ALARM" };

export default function StaffAreaPage() {
  return <StaffAreaView />;
}
