import type { Metadata } from "next";
import { SuperActivity } from "./super-activity";

export const metadata: Metadata = { title: "কাজের লগ · সুপার অ্যাডমিন · ALARM" };

export default function SuperActivityPage() {
  return <SuperActivity />;
}
