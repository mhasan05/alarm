import type { Metadata } from "next";
import { ReviewerCreatePolitician } from "./create-view";

export const metadata: Metadata = { title: "নতুন রাজনৈতিক কর্মী · ALARM" };

/** A নির্বাহী সম্পাদক creates রাজনৈতিক কর্মী accounts — only inside their own coverage areas. */
export default function Page() {
  return <ReviewerCreatePolitician />;
}
