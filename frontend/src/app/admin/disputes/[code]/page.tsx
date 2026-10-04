import type { Metadata } from "next";
import { AdminDisputeView } from "./dispute-view";

export async function generateMetadata({ params }: PageProps<"/admin/disputes/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `${code} · অভিযোগ · ALARM` };
}

export default async function AdminDisputePage({ params }: PageProps<"/admin/disputes/[code]">) {
  const { code } = await params;
  return <AdminDisputeView code={code} />;
}
